package com.daydrinker.pet

import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.RadioGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.daydrinker.pet.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        restoreSelectedPet()

        binding.petRadioGroup.setOnCheckedChangeListener { _, checkedId ->
            val petId = petIdForRadioId(checkedId)
            prefs.edit().putString(KEY_PET, petId).apply()
            PetOverlayService.setPetLive(this, petId)
        }

        binding.grantPermissionButton.setOnClickListener {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
        }

        binding.startButton.setOnClickListener {
            if (!hasOverlayPermission()) {
                Toast.makeText(this, R.string.permission_needed, Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            val petId = prefs.getString(KEY_PET, PetOverlayService.DEFAULT_PET) ?: PetOverlayService.DEFAULT_PET
            PetOverlayService.start(this, petId)
        }

        binding.stopButton.setOnClickListener {
            PetOverlayService.stop(this)
        }
    }

    override fun onResume() {
        super.onResume()
        refreshPermissionStatus()
    }

    private fun refreshPermissionStatus() {
        val granted = hasOverlayPermission()
        binding.permissionStatus.setText(
            if (granted) R.string.permission_granted else R.string.permission_needed
        )
        binding.grantPermissionButton.isEnabled = !granted
    }

    private fun hasOverlayPermission(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)
    }

    private fun restoreSelectedPet() {
        val petId = prefs.getString(KEY_PET, PetOverlayService.DEFAULT_PET)
        val radioId = when (petId) {
            "westie" -> R.id.petWestie
            "snail" -> R.id.petSnail
            "mouse" -> R.id.petMouse
            "kiwi" -> R.id.petKiwi
            else -> R.id.petLoris
        }
        binding.petRadioGroup.check(radioId)
    }

    private fun petIdForRadioId(radioId: Int): String = when (radioId) {
        R.id.petWestie -> "westie"
        R.id.petSnail -> "snail"
        R.id.petMouse -> "mouse"
        R.id.petKiwi -> "kiwi"
        else -> "loris"
    }

    companion object {
        private const val PREFS_NAME = "daydrinker_prefs"
        private const val KEY_PET = "pet_id"
    }
}
