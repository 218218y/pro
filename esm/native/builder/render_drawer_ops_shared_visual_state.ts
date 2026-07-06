import { resolveAdhesiveGlassKind } from '../features/door_authoring/api.js';
import type { MirrorLayoutList } from '../../../types';
import { readDoorVisualMapValue, readDoorVisualMirrorLayout } from './door_visual_lookup_state.js';
import { readCurtainType } from './render_door_ops_shared.js';
import type { DrawerConfig, GetPartColorValueFn } from './render_drawer_ops_shared_types.js';

export function resolveDrawerVisualState(
  cfg: DrawerConfig,
  partId: string,
  getPartColorValue: GetPartColorValueFn | null
): {
  isMirror: boolean;
  isGlass: boolean;
  curtainType: string | null | undefined;
  adhesiveGlassKind?: 'black_glass' | 'frosted_glass' | null;
  mirrorLayout: MirrorLayoutList | null;
} {
  if (!cfg.isMultiColorMode)
    return {
      isMirror: false,
      isGlass: false,
      curtainType: null,
      adhesiveGlassKind: null,
      mirrorLayout: null,
    };

  let isMirror = false;
  let isGlass = false;
  let adhesiveGlassKind: 'black_glass' | 'frosted_glass' | null = null;
  let curtainType = readCurtainType(readDoorVisualMapValue(cfg.curtainMap, partId));
  const special = readDoorVisualMapValue(cfg.doorSpecialMap, partId);

  if (special === 'mirror') isMirror = true;
  else if (special === 'glass') isGlass = true;
  else adhesiveGlassKind = resolveAdhesiveGlassKind(special);

  if (!isMirror && !isGlass && !adhesiveGlassKind && getPartColorValue) {
    const value = getPartColorValue(partId);
    if (value === 'mirror') isMirror = true;
    else if (value === 'glass') isGlass = true;
    else adhesiveGlassKind = resolveAdhesiveGlassKind(value);
  }

  if (!isMirror && !isGlass && !adhesiveGlassKind && curtainType && curtainType !== 'none') isGlass = true;
  if (isMirror) {
    isGlass = false;
    adhesiveGlassKind = null;
    curtainType = null;
  }
  if (isGlass) adhesiveGlassKind = null;
  if (adhesiveGlassKind) {
    isGlass = false;
    curtainType = null;
  }

  const shouldUseMirrorLayout = isMirror || !!adhesiveGlassKind;
  const mirrorLayout = shouldUseMirrorLayout
    ? readDoorVisualMirrorLayout(cfg.mirrorLayoutMap, partId) || null
    : null;

  return {
    isMirror,
    isGlass,
    curtainType,
    ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
    mirrorLayout: mirrorLayout && mirrorLayout.length ? mirrorLayout : null,
  };
}
