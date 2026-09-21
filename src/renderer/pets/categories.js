// Mirrors the Land / Birds / Sea Life groupings in electron/main.js's tray
// menu — kept as a separate small map here since the renderer needs it to
// pick a home environment (grass patch / perch / fishbowl) per pet, and the
// main process's file isn't reachable as an ES module import from here.
export const PET_CATEGORY = {
  loris: 'land',
  westie: 'land',
  mouse: 'land',
  rat: 'land',
  squirrel: 'land',
  deer: 'land',
  sheep: 'land',
  monkey: 'land',
  hotdogmonkey: 'land',
  frog: 'land',
  bat: 'land',

  kiwi: 'birds',
  chicken: 'birds',
  rooster: 'birds',
  duck: 'birds',
  duckling: 'birds',
  pigeon: 'birds',
  seagull: 'birds',
  budgie: 'birds',

  snail: 'sea',
  shark: 'sea',
  turtle: 'sea',
  octopus: 'sea',
  clownfish: 'sea',
  angelfish: 'sea',
  stingray: 'sea',
  mantaray: 'sea',
  crab: 'sea',
  hermitcrab: 'sea',
  shrimp: 'sea',
};
