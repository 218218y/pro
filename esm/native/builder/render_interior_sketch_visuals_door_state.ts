import type { GrooveLayoutList, MirrorLayoutList } from '../../../types';
import type { InteriorOpsCallable } from './render_interior_ops_contracts.js';
import type { RenderInteriorSketchInput } from './render_interior_sketch_shared.js';

import { isCallable, readNullableStringMap, readUnknownMap } from './render_interior_sketch_shared.js';
import { resolveAdhesiveGlassKind } from '../features/door_authoring/api.js';
import {
  readDoorVisualMapValue,
  readDoorVisualMirrorLayout,
  readGrooveLayoutListForPart,
} from './door_visual_lookup_state.js';
import { requireInteriorSketchConfigSnapshot } from './render_interior_sketch_input_contract.js';

export function resolveSketchFrontVisualState(
  input: RenderInteriorSketchInput,
  partId: string
): {
  isMirror: boolean;
  isGlass: boolean;
  curtainType: string | null;
  adhesiveGlassKind?: 'black_glass' | 'frosted_glass' | null;
  mirrorLayout: MirrorLayoutList | null;
  grooveLayout: GrooveLayoutList | null;
} {
  const cfg = requireInteriorSketchConfigSnapshot(input.cfgSnapshot, 'render_interior_sketch.visualState');
  const doorSpecialMap = readNullableStringMap(cfg?.doorSpecialMap);
  const curtainMap = readUnknownMap(cfg?.curtainMap);
  const mirrorLayoutMap = readUnknownMap(cfg?.mirrorLayoutMap);
  const grooveLayoutMap = readUnknownMap(cfg?.grooveLayoutMap);
  const getPartColorValue = input.getPartColorValue;

  let isMirror = false;
  let isGlass = false;
  let adhesiveGlassKind: 'black_glass' | 'frosted_glass' | null = null;
  const special = (() => {
    const value = readDoorVisualMapValue(doorSpecialMap, partId);
    return typeof value === 'string' ? String(value) : '';
  })();
  let curtainType = (() => {
    const value = readDoorVisualMapValue(curtainMap, partId);
    return typeof value === 'string' && value && value !== 'none' ? String(value) : null;
  })();

  if (cfg?.isMultiColorMode) {
    if (special === 'mirror') isMirror = true;
    else if (special === 'glass') isGlass = true;
    else adhesiveGlassKind = resolveAdhesiveGlassKind(special);

    if (!isMirror && !isGlass && !adhesiveGlassKind && isCallable(getPartColorValue)) {
      const colorValue = getPartColorValue(partId);
      if (colorValue === 'mirror') isMirror = true;
      else if (colorValue === 'glass') isGlass = true;
      else adhesiveGlassKind = resolveAdhesiveGlassKind(colorValue);
    }
    if (!isMirror && !isGlass && !adhesiveGlassKind && curtainType) isGlass = true;
  }

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
  const mirrorLayout = shouldUseMirrorLayout ? readDoorVisualMirrorLayout(mirrorLayoutMap, partId) || [] : [];
  return {
    isMirror,
    isGlass,
    curtainType: isGlass ? curtainType : null,
    ...(adhesiveGlassKind ? { adhesiveGlassKind } : null),
    mirrorLayout: mirrorLayout.length ? mirrorLayout : null,
    grooveLayout: readGrooveLayoutListForPart({ map: grooveLayoutMap, partId })?.layouts || null,
  };
}

export function resolveSketchBoxDoorVisualState(
  input: RenderInteriorSketchInput,
  partId: string
): {
  isMirror: boolean;
  isGlass: boolean;
  curtainType: string | null;
  adhesiveGlassKind?: 'black_glass' | 'frosted_glass' | null;
  mirrorLayout: MirrorLayoutList | null;
  grooveLayout: GrooveLayoutList | null;
} {
  return resolveSketchFrontVisualState(input, partId);
}

export function readSketchDoorVisualFactory(value: unknown): InteriorOpsCallable | null {
  return isCallable(value) ? value : null;
}
