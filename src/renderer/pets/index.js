import { createWestie } from './westie.js';
import { createLoris } from './loris.js';
import { createSnail } from './snail.js';
import { createMouse } from './mouse.js';
import { createKiwi } from './kiwi.js';

export const PET_FACTORIES = {
  westie: createWestie,
  loris: createLoris,
  snail: createSnail,
  mouse: createMouse,
  kiwi: createKiwi,
};

export const DEFAULT_PET = 'loris';
