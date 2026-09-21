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
- Hover over the pet and its tail (or ears, or claw, or beak — whatever that
  species has) shakes with excitement.
- **Pet it.** Click and stroke across it with the mouse held down and it
  stands still, squishes happily, wags like mad and puffs out little hearts.
- A plain click (no stroke) still toggles between "sit and stay right here"
  and "go wander."
- A tray icon lets you swap between pets and force a sit/wander.
- It animates on a deliberately chunky ~10fps clock, moves on a 2px grid and
  drops the occasional frame, and every pet gets a random permanent tilt and
  uneven squash when it loads. It's supposed to look like a cheap virtual pet
  from 2001, not a smooth 120Hz demo — a lopsided little bugger.
- **Pick it up.** Drag it further than a stroke and you've scooped it up; it
  dangles from the cursor and plops back down where you drop it.
- **It notices you.** Leave the cursor near it for a moment and it'll wander
  over to see what you're doing (then lose interest, so it isn't clingy).
- **It sleeps.** After a few minutes of system idle it dozes off with little
  Z's floating up, and stretches awake when you come back. It's also slower
  late at night and first thing in the morning.
- **It makes noises** — chirps, munching, snoring, a little fanfare — all
  synthesized as square waves on the fly, so there are no audio files and it
  can't sound too nice. Mutable from the tray.
- Every critter is built from cheap, faceted, low-poly primitives with flat
  shading — no smooth normals, no fancy textures — on purpose. Cutesy but
  dumb-looking, like a PS2 mascot.

## Its home and its toys

Every pet has a home near the left edge of the screen, themed to what it is —
grass and a kennel for land animals, a perch and birdbath for birds, a
fishbowl for sea life — and it wanders back there on its own now and then.

A shelf of toys sits next to it. Clicking a toy is never "click, link opens":
the pet trots over and *does something* first, and the useful bit happens
afterwards.

| Toy | What the pet does | What you get |
| --- | --- | --- |
| Music note | Runs over, lifts its head and sings, notes puffing out of it | Spotify opens (desktop app, else web player) |
| Ball | Bounces around after it | Opens your browser link |
| Food bowl | Eats, dropping crumbs | Hunger topped up (see below) |
| Clock | Settles in to work with you | Starts a 25-minute focus session |

## Being an actual work buddy

- **Focus sessions.** Start one from the clock toy or the tray. At the bell
  it plays a fanfare and tells you your count for the day and your streak.
- **Streaks.** Sessions per day and consecutive days are kept on disk, so the
  buddy you kept going yesterday is the one that shows up today.
- **It pesters you** (goose mode, toggleable in the tray). Every so often it
  marches over to your cursor, stands on it, and slaps a sticky note on your
  screen telling you to drink water or stand up. Click the note or the pet to
  dismiss it. It always gives up on its own after ~25s too — it can annoy
  you, but it can never trap you.
- **"Remind me in…"** from the tray — 5/10/20/30 minutes, delivered the same
  way.

## Looking after it

It's a little bit tamagotchi: hunger and happiness drift down through the
day, feeding it at the bowl tops hunger up, scratching it and finishing focus
sessions make it happier. A hungry or sad pet gets visibly droopier and
dawdles more; one you keep fed and busy grows slightly bigger over time. All
of it is saved between runs.

## Pets

30 of them, grouped the way the tray menu groups them.

**Land** — Slow Loris, Westie Pup, Snack Mouse, Gray Rat, Squirrel, Little
Deer, Sheep, Monkey, Hot Dog Monkey (a monkey in a hot dog costume — sausage,
bun, mustard squiggle and all), Frog, Bat.

**Birds** — Kiwi Bird, Chicken, Rooster, Duck, Duckling, Pigeon, Seagull,
Budgie.

**Sea Life** — Skate Snail (parked on a skateboard), Shark, Turtle, Octopus,
Clownfish, Angelfish, Stingray, Manta Ray, Crab, Hermit Crab, Shrimp.

Every one of them is built from the same handful of cheap faceted primitives
in `lowpoly.js` — no two share a model, but they all share the same walk /
idle / sit vocabulary, plus flippers-instead-of-legs for the swimmers and
wings-instead-of-arms for the birds and the bat.

## Running it

```bash
npm install
npm start
```

Or just double-click **`run.bat`** (Windows) or run **`./run.sh`** (macOS/
Linux) from the repo root — either installs dependencies on first run (needs
[Node.js](https://nodejs.org) installed) and then launches it. No packaged
`.exe` yet; these scripts are the "just run the thing" option in the
meantime.

The app has no window chrome — look for the tray icon to change pets, force
a sit, or quit.

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
  (blobs, blocks, stubs, spikes, a generic leg rig with a walk/sit pose, and
  a wing rig with a flap/fold pose) that every critter is built out of.
- `src/renderer/pets/*.js` — one file per species, each just a pile of
  primitives + a per-frame `update(t, state)` for its walk/idle/sit poses.
- `src/renderer/petController.js` is the tiny state machine deciding where
  the pet is walking to, when it pauses, and how much it's "sitting" — a
  0–1 blend the pet models use to ease between standing and sitting rather
  than a hard cut. It also biases wander targets toward `homeX` sometimes,
  so the pet actually visits its kennel instead of just roaming forever.
- `src/renderer/environments.js` builds the three home types (land/birds/sea,
  picked via `src/renderer/pets/categories.js`) and the toy shelf. Toys are
  data: a `TOYS` array of `{ build, perform, action }`, so a new trick is one
  builder plus one entry. Their clicks ride the same hit-region trick as the
  pet itself — `main.js` keeps a hover box per toy and tells the main process
  to stop ignoring the mouse only over those boxes.
- `src/renderer/petState.js` is the care loop (hunger, happiness, streak,
  growth) as plain data with no rendering in it; `electron/main.js` persists
  it to `daydrinker-state.json` in Electron's userData directory.
- `src/renderer/sounds.js` synthesizes every noise with oscillators, and
  `src/renderer/particles.js` pools the hearts / notes / Z's / crumbs.
  `src/renderer/stickyNote.js` is the goose-mode note: a canvas texture on a
  quad, deliberately crooked.
- Idle detection comes from `powerMonitor.getSystemIdleTime()` in the main
  process, polled every 4s and pushed to the renderer.

## Adding a new pet

1. Add `src/renderer/pets/yourpet.js` exporting `createYourPet()`, returning
   `{ group, update(t, state) }` — build `group` from the helpers in
   `lowpoly.js`, and use `state.walking` / `state.sitAmount` in `update` to
   drive the pose (see any existing pet file for the pattern).
2. Register it in `src/renderer/pets/index.js`'s `PET_FACTORIES`.
3. Add it to a category's `pets` map in `PET_CATEGORIES` in `electron/main.js`
   (that's what builds the tray's Land / Birds / Sea Life submenus).

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
