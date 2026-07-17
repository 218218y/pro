import { meters } from './units.js';

const MATERIAL_THICKNESS_M = meters(0.018);

export const MATERIAL_THICKNESS_POLICY = Object.freeze({
  wood: Object.freeze({
    thicknessM: MATERIAL_THICKNESS_M,
  }),
  glassShelf: Object.freeze({
    thicknessM: MATERIAL_THICKNESS_M,
  }),
});
