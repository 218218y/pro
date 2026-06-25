import {
  FRONT_COLOR_SHELF_MODE_ALL,
  FRONT_COLOR_SHELF_MODE_BRACE,
  type FrontColorShelfInheritanceMode,
} from '../../shared/front_color_shelf_inheritance_shared.js';

export type { FrontColorShelfInheritanceMode } from '../../shared/front_color_shelf_inheritance_shared.js';
export {
  DEFAULT_FRONT_COLOR_SHELF_INHERITANCE_MODE,
  FRONT_COLOR_SHELF_MODE_ALL,
  FRONT_COLOR_SHELF_MODE_BRACE,
} from '../../shared/front_color_shelf_inheritance_shared.js';

export function normalizeFrontColorShelfInheritanceMode(value: unknown): FrontColorShelfInheritanceMode {
  return value === FRONT_COLOR_SHELF_MODE_ALL ? FRONT_COLOR_SHELF_MODE_ALL : FRONT_COLOR_SHELF_MODE_BRACE;
}

export function isFrontColorBraceShelvesOnlyMode(value: unknown): boolean {
  return normalizeFrontColorShelfInheritanceMode(value) === FRONT_COLOR_SHELF_MODE_BRACE;
}

export function getNextFrontColorShelfInheritanceMode(value: unknown): FrontColorShelfInheritanceMode {
  return isFrontColorBraceShelvesOnlyMode(value) ? FRONT_COLOR_SHELF_MODE_ALL : FRONT_COLOR_SHELF_MODE_BRACE;
}
