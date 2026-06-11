import { readDoorVisualMapValue } from './door_visual_lookup_state.js';
import { readCurtainType } from './render_door_ops_shared.js';
import type { DrawerConfig, GetPartColorValueFn } from './render_drawer_ops_shared_types.js';

export function resolveDrawerVisualState(
  cfg: DrawerConfig,
  partId: string,
  getPartColorValue: GetPartColorValueFn | null
): { isMirror: boolean; isGlass: boolean; curtainType: string | null | undefined } {
  if (!cfg.isMultiColorMode) return { isMirror: false, isGlass: false, curtainType: null };

  let isMirror = false;
  let isGlass = false;
  let curtainType = readCurtainType(readDoorVisualMapValue(cfg.curtainMap, partId));
  const special = readDoorVisualMapValue(cfg.doorSpecialMap, partId);

  if (special === 'mirror') isMirror = true;
  else if (special === 'glass') isGlass = true;
  else if (getPartColorValue) {
    const value = getPartColorValue(partId);
    if (value === 'mirror') isMirror = true;
    else if (value === 'glass') isGlass = true;
  }

  if (!isMirror && !isGlass && curtainType && curtainType !== 'none') isGlass = true;
  if (isMirror) {
    isGlass = false;
    curtainType = null;
  }

  return { isMirror, isGlass, curtainType };
}
