# DayDrinker

A dumb little low-poly, PS2-era desktop pet. It lives on your screen, wanders
around the bottom of it, sits when you tell it to, and otherwise does
basically nothing — like a Figma pet, but roaming your whole monitor instead
of one file.

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
