import type { MirrorLayoutList } from '../../../types';
import type { InteriorOpsCallable } from './render_interior_ops_contracts.js';
import type { RenderInteriorSketchInput } from './render_interior_sketch_shared.js';

import {
  asValueRecord,
  isCallable,
  readNullableStringMap,
  readUnknownMap,
} from './render_interior_sketch_shared.js';
import { readDoorVisualMapValue, readDoorVisualMirrorLayout } from './door_visual_lookup_state.js';

export function resolveSketchFrontVisualState(
  input: RenderInteriorSketchInput,
  partId: string
): {
  isMirror: boolean;
  isGlass: boolean;
  curtainType: string | null;
  mirrorLayout: MirrorLayoutList | null;
} {
  const cfg = asValueRecord(input.cfg);
  const doorSpecialMap = readNullableStringMap(cfg?.doorSpecialMap);
  const curtainMap = readUnknownMap(cfg?.curtainMap);
  const mirrorLayoutMap = readUnknownMap(cfg?.mirrorLayoutMap);
  const getPartColorValue = input.getPartColorValue;

  let isMirror = false;
  let isGlass = false;
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
    else if (isCallable(getPartColorValue)) {
      const colorValue = getPartColorValue(partId);
      if (colorValue === 'mirror') isMirror = true;
      else if (colorValue === 'glass') isGlass = true;
    }
    if (!isMirror && !isGlass && curtainType) isGlass = true;
  }

  if (isMirror) {
    isGlass = false;
    curtainType = null;
  }

  const mirrorLayout = isMirror ? readDoorVisualMirrorLayout(mirrorLayoutMap, partId) || [] : [];
  return {
    isMirror,
    isGlass,
    curtainType: isGlass ? curtainType : null,
    mirrorLayout: mirrorLayout.length ? mirrorLayout : null,
  };
}

export function resolveSketchBoxDoorVisualState(
  input: RenderInteriorSketchInput,
  partId: string
): {
  isMirror: boolean;
  isGlass: boolean;
  curtainType: string | null;
  mirrorLayout: MirrorLayoutList | null;
} {
  return resolveSketchFrontVisualState(input, partId);
}

export function readSketchDoorVisualFactory(value: unknown): InteriorOpsCallable | null {
  return isCallable(value) ? value : null;
}
