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
  let curtainType = readCurtainType(cfg.curtainMap ? cfg.curtainMap[partId] : null);
  const special = cfg.doorSpecialMap ? cfg.doorSpecialMap[partId] : null;

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
