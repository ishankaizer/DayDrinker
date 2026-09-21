package com.daydrinker.pet

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.core.app.NotificationCompat
import androidx.webkit.WebViewAssetLoader
import kotlin.math.abs
import kotlin.math.sign
import kotlin.random.Random

/**
 * Renders the pet in a small floating window that roams the bottom of the
 * screen over top of whatever else is running, the same way chat-head-style
 * overlays work. The window itself is what "walks" (native side moves it);
 * the WebView inside just plays the in-place walk/idle/sit animation.
 */
class PetOverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private var container: FrameLayout? = null
    private var webView: WebView? = null
    private var params: WindowManager.LayoutParams? = null

    private val handler = Handler(Looper.getMainLooper())
    private var lastTickNanos = 0L
    private var running = false

    // -- movement state machine (mirrors the desktop PetController, but
    // drives a native window position instead of a canvas coordinate) --
    private var petId = DEFAULT_PET
    private var x = 0f
    private var targetX = 0f
    private var facing = 1
    private var mode = Mode.PAUSING
    private var pauseUntilMs = 0L
    private var pausedSitTarget = 0.15f
    private var userSit = false
    private var draggingNow = false

    private var lastPushedWalking: Boolean? = null
    private var lastPushedSitTarget: Float? = null
    private var lastPushedFacing: Int? = null

    private var overlaySizePx = 0
    private var groundYPx = 0
    private var screenWidthPx = 0
    private var screenHeightPx = 0

    private enum class Mode { WALKING, PAUSING }

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopOverlay()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_SET_PET -> {
                petId = intent.getStringExtra(EXTRA_PET_ID) ?: petId
                if (container == null) {
                    // overlay isn't out right now; just remember the choice and exit
                    stopSelf()
                    return START_NOT_STICKY
                }
                webView?.evaluateJavascript("window.DayDrinker && window.DayDrinker.setPet('$petId')", null)
            }
            else -> {
                petId = intent?.getStringExtra(EXTRA_PET_ID) ?: petId
                startForeground(NOTIFICATION_ID, buildNotification())
                startOverlay()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopOverlay()
        super.onDestroy()
    }

    // ---------------------------------------------------------------------
    // overlay window setup
    // ---------------------------------------------------------------------

    private fun startOverlay() {
        if (container != null) return

        val metrics = resources.displayMetrics
        screenWidthPx = metrics.widthPixels
        screenHeightPx = metrics.heightPixels
        overlaySizePx = (150 * metrics.density).toInt()
        val groundMarginPx = (36 * metrics.density).toInt()
        groundYPx = screenHeightPx - overlaySizePx - groundMarginPx

        val overlayType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        val layoutParams = WindowManager.LayoutParams(
            overlaySizePx,
            overlaySizePx,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
        }

        x = screenWidthPx / 2f
        targetX = x
        layoutParams.x = x.toInt()
        layoutParams.y = groundYPx

        // Serving assets via file:// leaves ES module imports (three.js's
        // `import` inside overlay-main.js) unreliable in WebView — some
        // OEM WebView builds silently refuse the cross-file fetch, which
        // renders nothing but still leaves the overlay window sitting there
        // eating touches. WebViewAssetLoader maps assets/ to a proper
        // https://appassets.androidplatform.net origin instead, which
        // behaves like a normal web page and avoids that entirely.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        val webViewLocal = WebView(this).apply {
            setBackgroundColor(0x00000000)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
            }
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                    Log.d(LOG_TAG, "pet webview: ${message.message()} (${message.sourceId()}:${message.lineNumber()})")
                    return true
                }
            }
            loadUrl("https://appassets.androidplatform.net/assets/pet/overlay.html")
        }

        val containerLocal = FrameLayout(this).apply {
            setBackgroundColor(0x00000000)
            addView(webViewLocal, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            setOnTouchListener(dragTouchListener)
        }

        windowManager.addView(containerLocal, layoutParams)
        container = containerLocal
        webView = webViewLocal
        params = layoutParams

        webViewLocal.postDelayed({
            webViewLocal.evaluateJavascript("window.DayDrinker && window.DayDrinker.setPet('$petId')", null)
        }, 300)

        running = true
        lastTickNanos = System.nanoTime()
        handler.post(tickRunnable)
    }

    private fun stopOverlay() {
        running = false
        handler.removeCallbacks(tickRunnable)
        container?.let {
            runCatching { windowManager.removeView(it) }
        }
        webView?.destroy()
        container = null
        webView = null
        params = null
    }

    // ---------------------------------------------------------------------
    // touch: tap toggles sit/wander, drag repositions and parks it sitting
    // ---------------------------------------------------------------------

    private var downRawX = 0f
    private var downRawY = 0f
    private var downParamsX = 0
    private var downParamsY = 0
    private var downTimeMs = 0L

    private val dragTouchListener = View.OnTouchListener { _, event ->
        val p = params ?: return@OnTouchListener false
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                downRawX = event.rawX
                downRawY = event.rawY
                downParamsX = p.x
                downParamsY = p.y
                downTimeMs = System.currentTimeMillis()
                draggingNow = false
                true
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - downRawX
                val dy = event.rawY - downRawY
                if (!draggingNow && (abs(dx) > touchSlopPx || abs(dy) > touchSlopPx)) {
                    draggingNow = true
                    userSit = true // freeze auto-wander while the user is holding it
                }
                if (draggingNow) {
                    p.x = (downParamsX + dx).toInt().coerceIn(0, (screenWidthPx - overlaySizePx).coerceAtLeast(0))
                    p.y = (downParamsY + dy).toInt().coerceIn(0, (screenHeightPx - overlaySizePx).coerceAtLeast(0))
                    container?.let { windowManager.updateViewLayout(it, p) }
                    x = p.x.toFloat()
                }
                true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                if (!draggingNow) {
                    // a plain tap: toggle sit-in-place / go wander again
                    userSit = !userSit
                    if (!userSit) startWalkingToRandomTarget()
                } else {
                    // dropped after a drag: stays sitting right where it landed
                    targetX = x
                    userSit = true
                }
                draggingNow = false
                true
            }
            else -> false
        }
    }

    // ---------------------------------------------------------------------
    // movement / animation tick
    // ---------------------------------------------------------------------

    private val tickRunnable = object : Runnable {
        override fun run() {
            if (!running) return
            val now = System.nanoTime()
            val dt = ((now - lastTickNanos) / 1_000_000_000.0).toFloat().coerceIn(0f, 0.05f)
            lastTickNanos = now
            tick(dt)
            handler.postDelayed(this, 16)
        }
    }

    private fun startWalkingToRandomTarget() {
        val margin = overlaySizePx / 2
        val range = (screenWidthPx - margin * 2).coerceAtLeast(1)
        targetX = (margin + Random.nextInt(range)).toFloat()
        mode = Mode.WALKING
    }

    private fun startPausing() {
        mode = Mode.PAUSING
        pausedSitTarget = if (Random.nextFloat() < 0.45f) 1f else 0.1f
        pauseUntilMs = System.currentTimeMillis() + 1200 + Random.nextInt(3500)
    }

    private fun tick(dt: Float) {
        val p = params ?: return
        if (draggingNow) {
            pushWalking(false)
            pushSitTarget(1f)
            return
        }

        val walking: Boolean
        val sitTarget: Float

        if (userSit) {
            walking = false
            sitTarget = 1f
        } else when (mode) {
            Mode.PAUSING -> {
                walking = false
                sitTarget = pausedSitTarget
                if (System.currentTimeMillis() >= pauseUntilMs) startWalkingToRandomTarget()
            }
            Mode.WALKING -> {
                val dx = targetX - x
                val dist = abs(dx)
                if (dist < 4f) {
                    startPausing()
                    walking = false
                    sitTarget = pausedSitTarget
                } else {
                    walking = true
                    sitTarget = 0f
                    val newFacing = sign(dx).toInt().let { if (it == 0) facing else it }
                    if (newFacing != facing) {
                        facing = newFacing
                        pushFacing(facing)
                    }
                    val step = (WALK_SPEED_PX_PER_SEC * dt).coerceAtMost(dist)
                    x += step * sign(dx)
                    p.x = x.toInt().coerceIn(0, (screenWidthPx - overlaySizePx).coerceAtLeast(0))
                    container?.let { windowManager.updateViewLayout(it, p) }
                }
            }
        }

        pushWalking(walking)
        pushSitTarget(sitTarget)
    }

    private fun pushWalking(value: Boolean) {
        if (lastPushedWalking == value) return
        lastPushedWalking = value
        webView?.evaluateJavascript("window.DayDrinker && window.DayDrinker.setWalking(${value})", null)
    }

    private fun pushSitTarget(value: Float) {
        if (lastPushedSitTarget != null && abs(lastPushedSitTarget!! - value) < 0.001f) return
        lastPushedSitTarget = value
        webView?.evaluateJavascript("window.DayDrinker && window.DayDrinker.setSitTarget($value)", null)
    }

    private fun pushFacing(value: Int) {
        if (lastPushedFacing == value) return
        lastPushedFacing = value
        webView?.evaluateJavascript("window.DayDrinker && window.DayDrinker.setFacing($value)", null)
    }

    // ---------------------------------------------------------------------
    // notification (a floating overlay must run as a foreground service)
    // ---------------------------------------------------------------------

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_MIN
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val stopIntent = Intent(this, PetOverlayService::class.java).setAction(ACTION_STOP)
        val stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(stopPendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    companion object {
        const val DEFAULT_PET = "loris"

        private const val LOG_TAG = "DayDrinkerPet"
        private const val CHANNEL_ID = "daydrinker_pet"
        private const val NOTIFICATION_ID = 1001
        private const val WALK_SPEED_PX_PER_SEC = 90f
        private const val touchSlopPx = 12

        private const val ACTION_STOP = "com.daydrinker.pet.action.STOP"
        private const val ACTION_SET_PET = "com.daydrinker.pet.action.SET_PET"
        private const val EXTRA_PET_ID = "extra_pet_id"

        fun start(context: Context, petId: String) {
            val intent = Intent(context, PetOverlayService::class.java).putExtra(EXTRA_PET_ID, petId)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, PetOverlayService::class.java).setAction(ACTION_STOP))
        }

        fun setPetLive(context: Context, petId: String) {
            val intent = Intent(context, PetOverlayService::class.java)
                .setAction(ACTION_SET_PET)
                .putExtra(EXTRA_PET_ID, petId)
            context.startService(intent)
        }
    }
}
