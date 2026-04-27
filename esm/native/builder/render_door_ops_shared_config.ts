import type { MirrorLayoutList } from '../../../types';
import {
  readDoorStyleMap,
  resolveEffectiveDoorStyle,
  type DoorStyleOverrideValue,
} from '../features/door_style_overrides.js';
import type {
  GetHandleTypeFn,
  GetPartColorValueFn,
  SlidingDoorConfig,
  SlidingDoorVisualState,
  SlidingUiState,
} from './render_door_ops_shared_contracts.js';
import { isRecord, readCurtainType } from './render_door_ops_shared_core.js';
import { readDoorVisualMapValue, readDoorVisualMirrorLayout } from './door_visual_lookup_state.js';

function readObjectMap(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function readStringNullableMap(value: unknown): Record<string, string | null | undefined> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Record<string, string | null | undefined> = Object.create(null);
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

function resolveCurtain(curtainMap: Record<string, unknown> | undefined, partId: string): unknown {
  if (!curtainMap || !partId) return null;
  return readDoorVisualMapValue(curtainMap, partId);
}

export function readDoorConfig(value: unknown): SlidingDoorConfig {
  if (!isRecord(value)) return {};
  return {
    groovesMap: readObjectMap(value.groovesMap),
    doorSpecialMap: readStringNullableMap(value.doorSpecialMap),
    doorStyleMap: readDoorStyleMap(value.doorStyleMap),
    curtainMap: readObjectMap(value.curtainMap),
    mirrorLayoutMap: readObjectMap(value.mirrorLayoutMap),
    doorTrimMap: readObjectMap(value.doorTrimMap),
    handlesMap: readObjectMap(value.handlesMap),
    isMultiColorMode: value.isMultiColorMode === true,
    slidingDoorHandlesEnabled: value.slidingDoorHandlesEnabled === true,
  };
}

export function readSlidingUiState(value: unknown): SlidingUiState {
  if (!isRecord(value)) return {};
  return {
    groovesEnabled: value.groovesEnabled === true,
    slidingTracksColor: typeof value.slidingTracksColor === 'string' ? value.slidingTracksColor : undefined,
  };
}

export function resolveDoorVisualStyle(
  explicitStyle: unknown,
  globalStyle: unknown,
  doorStyleMap: SlidingDoorConfig['doorStyleMap'],
  partId: string
): DoorStyleOverrideValue | 'glass' {
  return explicitStyle === 'glass'
    ? 'glass'
    : resolveEffectiveDoorStyle(explicitStyle ?? globalStyle, doorStyleMap, partId);
}

export function resolveMirrorLayout(cfg: SlidingDoorConfig, partId: string): MirrorLayoutList | null {
  const map = cfg.mirrorLayoutMap;
  if (!map || typeof partId !== 'string' || !partId) return null;
  return readDoorVisualMirrorLayout(map, partId);
}

export function resolveSlidingDoorVisualState(
  cfg: SlidingDoorConfig,
  partId: string,
  getPartColorValue: GetPartColorValueFn | null
): SlidingDoorVisualState {
  let isMirror = false;
  let isGlass = false;
  let curtain = readCurtainType(resolveCurtain(cfg.curtainMap, partId));

  if (cfg.isMultiColorMode) {
    const special = readDoorVisualMapValue(cfg.doorSpecialMap, partId);
    if (special === 'mirror') isMirror = true;
    else if (special === 'glass') isGlass = true;
    else if (getPartColorValue) {
      const value = getPartColorValue(partId);
      if (value === 'mirror') isMirror = true;
      else if (value === 'glass') isGlass = true;
    }
    if (!isMirror && !isGlass && curtain && curtain !== 'none') isGlass = true;
  }

  if (isMirror) {
    isGlass = false;
    curtain = null;
  }

  return { isMirror, isGlass, curtain };
}

export function resolveHandleType(getHandleType: GetHandleTypeFn | null, partId: string): string {
  const nextHandleType = getHandleType ? getHandleType(partId) : null;
  return typeof nextHandleType === 'string' && nextHandleType ? nextHandleType : 'standard';
}
