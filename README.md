# DayDrinker

A dumb little low-poly, PS2-era desktop pet. It lives on your screen, wanders
around the bottom of it, sits when you tell it to, and otherwise does
basically nothing — like a Figma pet, but roaming your whole monitor instead
of one file. There's a desktop build (`/`, Electron) and an Android build
(`/android`, a floating overlay app) — see below for each.

## Desktop (Electron)

## What it does

- Runs as a transparent, click-through, always-on-top overlay covering your
  screen — everything except the pet itself passes clicks straight through
  to whatever's underneath.
- The pet wanders left/right along the bottom of the screen with a walk
  cycle, pauses, sometimes flops into a sit on its own, then wanders again.
- Click the pet to toggle between "sit and stay right here" and "go wander."
- A tray icon lets you swap between pets and force a sit/wander.
- Every critter is built from cheap, faceted, low-poly primitives with flat
  shading — no smooth normals, no fancy textures — on purpose. Cutesy but
  dumb-looking, like a PS2 mascot.

## Pets

- **Slow Loris** — round-eyed, clings upright, tail curled.
- **Westie Pup** — a scruffy little terrier.
- **Skate Snail** — a snail parked on a skateboard.
- **Snack Mouse** — a mouse carrying its little chip bag.
- **Kiwi Bird** — a round, flightless little dork with a big beak.

## Running it

```bash
npm install
npm start
```

That launches the Electron app. It has no window chrome — look for the tray
icon to change pets, force a sit, or quit.

## How it's built

- **Electron** for the transparent always-on-top overlay window + system
  tray. `electron/main.js` owns the window and forwards mouse-move events
  into the renderer so it can report back whether the cursor is over the
  pet (`electron/preload.js` bridges that over `contextBridge`); everywhere
  else on screen, clicks pass straight through.
- **three.js** for rendering, loaded straight from `node_modules` as an ES
  module — no bundler. `src/renderer/main.js` sets up an orthographic
  camera mapped 1:1 to screen pixels, so pets are simply positioned at
  screen coordinates.
- `src/renderer/pets/lowpoly.js` has the shared faceted-geometry helpers
  (blobs, blocks, stubs, spikes, a generic leg rig with a walk/sit pose)
  that every critter is built out of.
- `src/renderer/pets/*.js` — one file per species, each just a pile of
  primitives + a per-frame `update(t, state)` for its walk/idle/sit poses.
- `src/renderer/petController.js` is the tiny state machine deciding where
  the pet is walking to, when it pauses, and how much it's "sitting" — a
  0–1 blend the pet models use to ease between standing and sitting rather
  than a hard cut.

## Adding a new pet

1. Add `src/renderer/pets/yourpet.js` exporting `createYourPet()`, returning
   `{ group, update(t, state) }` — build `group` from the helpers in
   `lowpoly.js`, and use `state.walking` / `state.sitAmount` in `update` to
   drive the pose (see any existing pet file for the pattern).
2. Register it in `src/renderer/pets/index.js`'s `PET_FACTORIES`.
3. Add it to the tray menu's `petLabels` in `electron/main.js`.

## Android

There's no OS-level "draw over every app" permission on iOS, but Android
grants exactly that (it's how apps like Facebook's chat heads work), so the
Android counterpart is a real floating-widget app, not a scaled-down in-app
pet. It lives in `android/` as its own Gradle project.

**What it does differently from desktop:** instead of one full-screen
transparent overlay with the renderer doing hit-testing, the Android app puts
the pet inside a small (200dp) floating window that the *native* side moves
around the screen — like a chat head. Tap the pet to toggle sit/wander, same
as desktop's click. Drag it and let go to park it sitting exactly where you
dropped it. A notification (required for any foreground/overlay service)
lets you put it away; the launcher app is where you grant the overlay
permission and pick which pet is out.

### Running it

Open `android/` in Android Studio (Hedgehog+), let it sync, run on a device
or emulator running Android 8.0 (API 26) or newer. First launch: grant "draw
over other apps" when prompted, pick a pet, tap "Let it out." This repo
includes the Gradle wrapper, so `./android/gradlew assembleDebug` also works
from the command line once the Android SDK is set up (`ANDROID_HOME` /
`local.properties`).

### How it's built

- `PetOverlayService.kt` is the whole thing: a foreground `Service` that adds
  a small `WindowManager` overlay (a `WebView` inside a `FrameLayout`), plus
  a movement state machine that mirrors the desktop `PetController` — pick a
  random target x, walk to it, pause (maybe sit), repeat — except it's
  nudging a native window position (`WindowManager.LayoutParams.x`) each
  frame instead of a canvas coordinate.
- Touch is handled entirely natively (`dragTouchListener`): a short tap
  toggles sit/wander; a drag repositions the window live and leaves it
  sitting wherever you release it. Nothing about this needs a JS bridge back
  into the page.
- The WebView just renders — it's the same three.js pet code from
  `src/renderer/pets/`, copied into `android/app/src/main/assets/pet/` with
  import paths pointed at a locally-bundled `vendor/three.module.min.js`
  (Android's WebView has no `node_modules` to reach into, and the overlay is
  offline-first). `overlay-main.js` is the Android equivalent of
  `src/renderer/main.js`, simplified: the pet stays anchored in place in a
  small canvas and just plays its walk/idle/sit pose — no on-screen
  wandering logic in JS, since the *window* is what moves now. The native
  side pushes state in one-way through `window.DayDrinker.{setPet,
  setWalking, setSitTarget, setFacing}` via `evaluateJavascript`.
- Adding a new pet: same as desktop (write it under `src/renderer/pets/`,
  register it in `pets/index.js`), then copy the two changed files into
  `android/app/src/main/assets/pet/pets/` and add a `RadioButton` + id
  mapping in `MainActivity.kt` / `activity_main.xml`.

### Note on this build

This project was assembled without a local Android SDK or emulator to
compile/run against, so the Gradle project hasn't been build-verified here —
open it in Android Studio and let it sync before trusting it end to end.
