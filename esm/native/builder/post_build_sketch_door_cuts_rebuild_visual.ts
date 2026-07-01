// Post-build sketch external-drawer segmented-door rebuild visual/material helpers (Pure ESM)
//
// Owns per-segment material selection and visual creation for segmented sketch-door rebuild flows.

import { resolveEffectiveDoorStyle } from '../features/door_authoring/api.js';
import { resolveDoorVisualSegmentIdentity } from '../../shared/door_visual_key_contracts_shared.js';
import {
  listDoorGrooveTargetLookupKeys,
  toCanonicalDoorGrooveTargetKey,
  toCanonicalGroovesMapKey,
} from '../../shared/door_groove_key_contracts_shared.js';
import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import { asRecord, isObject3DLike, type ValueRecord } from './post_build_extras_shared.js';

import type { SketchDoorCutsRuntime } from './post_build_sketch_door_cuts_contracts.js';
import type { SketchDoorNode } from './post_build_sketch_door_cuts_rebuild_shared.js';

export type SketchSegmentVisualFlags = {
  effectiveDoorStyle: string;
  segmentHasGroove: boolean;
  segmentIsMirror: boolean;
  segmentIsGlass: boolean;
  segmentCurtain: string | null;
  segmentMirrorLayout: unknown;
};

function readGrooveBooleanValue(value: unknown): boolean {
  return value === true;
}

function readSketchSegmentGrooveMapFlag(map: ValueRecord | null | undefined, partId: string): boolean | null {
  const key = toCanonicalGroovesMapKey(partId);
  if (!map || !key || !Object.prototype.hasOwnProperty.call(map, key)) return null;
  return readGrooveBooleanValue(map[key]);
}

function readSketchSegmentGrooveVisualMapFlag(
  map: ValueRecord | null | undefined,
  partId: string
): boolean | null {
  const keys = listDoorGrooveTargetLookupKeys(partId);
  for (let index = 0; index < keys.length; index += 1) {
    const flag = readSketchSegmentGrooveMapFlag(map, keys[index]);
    if (flag !== null) return flag;
  }
  return null;
}

function hasAnySketchSegmentGrooveMapEntry(map: ValueRecord | null | undefined, basePartId: string): boolean {
  const base = resolveDoorVisualSegmentIdentity(toCanonicalDoorGrooveTargetKey(basePartId)).basePartId;
  if (!map || !base) return false;
  const keys = Object.keys(map);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    if (!key || map[key] == null || key !== toCanonicalGroovesMapKey(key)) continue;
    const segmentPartId = toCanonicalDoorGrooveTargetKey(key);
    const identity = resolveDoorVisualSegmentIdentity(segmentPartId);
    if (identity.isSegment && identity.basePartId === base) return true;
  }
  return false;
}

export function readSegmentMaterial(args: {
  runtime: SketchDoorCutsRuntime;
  segmentPartId: string;
  segmentIsMirror: boolean;
}): { segmentPartMat: unknown; segmentWoodMat: unknown; segmentMirrorMat: unknown } {
  const { runtime, segmentPartId, segmentIsMirror } = args;
  const { bodyMat, globalFrontMat, getPartMaterial, getMirrorMaterial } = runtime;
  const segmentPartMat =
    (() => {
      try {
        return getPartMaterial ? getPartMaterial(segmentPartId) : null;
      } catch {
        return null;
      }
    })() || bodyMat;
  let segmentWoodMat = segmentPartMat;
  let segmentMirrorMat: unknown = null;
  if (segmentIsMirror) {
    try {
      segmentMirrorMat = getMirrorMaterial ? getMirrorMaterial() : null;
    } catch {
      segmentMirrorMat = null;
    }
    if (!segmentMirrorMat) segmentMirrorMat = segmentWoodMat;
    if (segmentWoodMat === segmentMirrorMat) segmentWoodMat = globalFrontMat || segmentWoodMat;
  }
  return { segmentPartMat, segmentWoodMat, segmentMirrorMat };
}

function readSketchSegmentGrooveEnabled(args: {
  groovesMap: ValueRecord | null | undefined;
  segmentPartId: string;
  sourceUserData?: ValueRecord | null;
}): boolean {
  const { groovesMap, segmentPartId, sourceUserData } = args;
  const basePartId = resolveDoorVisualSegmentIdentity(
    toCanonicalDoorGrooveTargetKey(segmentPartId)
  ).basePartId;
  const hasExplicitSegmentState = hasAnySketchSegmentGrooveMapEntry(groovesMap, basePartId);
  const directFlag = readSketchSegmentGrooveMapFlag(groovesMap, segmentPartId);

  if (directFlag !== null) return directFlag;
  if (hasExplicitSegmentState) return false;

  const inheritedFlag = readSketchSegmentGrooveVisualMapFlag(groovesMap, segmentPartId);
  if (inheritedFlag !== null) return inheritedFlag;

  return sourceUserData?.__wpSketchBoxDoorGroove === true;
}

export function resolveSketchSegmentVisualFlags(args: {
  runtime: SketchDoorCutsRuntime;
  segmentPartId: string;
  sourceUserData?: ValueRecord | null;
}): SketchSegmentVisualFlags {
  const { runtime, segmentPartId } = args;
  const { resolveCurtain, resolveSpecial, doorStyle, doorStyleMap, groovesMap, resolveMirrorLayout } =
    runtime;
  const sourceUserData = asRecord(args.sourceUserData);
  const segmentCurtain = resolveCurtain(segmentPartId);
  const segmentSpecial = resolveSpecial(segmentPartId, segmentCurtain);
  const segmentIsMirror = segmentSpecial === 'mirror';
  const segmentIsGlass = segmentSpecial === 'glass';
  const segmentHasGroove =
    runtime.groovesEnabled !== false &&
    !segmentIsMirror &&
    !segmentIsGlass &&
    readSketchSegmentGrooveEnabled({ groovesMap, segmentPartId, sourceUserData });
  return {
    effectiveDoorStyle: resolveEffectiveDoorStyle(doorStyle, doorStyleMap, segmentPartId),
    segmentHasGroove,
    segmentIsMirror,
    segmentIsGlass,
    segmentCurtain,
    segmentMirrorLayout: resolveMirrorLayout(segmentPartId),
  };
}

export function createSegmentVisual(args: {
  runtime: SketchDoorCutsRuntime;
  width: number;
  segHeight: number;
  thickness: number;
  segmentPartId: string;
  flags: SketchSegmentVisualFlags;
  segmentPartMat: unknown;
  segmentWoodMat: unknown;
  segmentMirrorMat: unknown;
}): SketchDoorNode {
  const {
    runtime,
    width,
    segHeight,
    thickness,
    segmentPartId,
    flags,
    segmentPartMat,
    segmentWoodMat,
    segmentMirrorMat,
  } = args;
  const { THREE, createDoorVisual, globalFrontMat } = runtime;
  let visual: unknown = null;
  if (createDoorVisual) {
    try {
      visual = createDoorVisual(
        Math.max(
          DRAWER_DIMENSIONS.sketch.rebuiltSegmentVisualMinDimensionM,
          width - DRAWER_DIMENSIONS.sketch.rebuiltSegmentVisualWidthClearanceM
        ),
        Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentVisualMinDimensionM, segHeight),
        thickness,
        flags.segmentIsMirror ? segmentMirrorMat : segmentPartMat,
        flags.segmentIsGlass ? 'glass' : flags.effectiveDoorStyle,
        flags.segmentHasGroove,
        flags.segmentIsMirror,
        flags.segmentIsGlass ? flags.segmentCurtain : null,
        flags.segmentIsMirror ? segmentWoodMat : globalFrontMat,
        1,
        false,
        flags.segmentMirrorLayout,
        segmentPartId,
        flags.segmentIsGlass ? { glassFrameStyle: flags.effectiveDoorStyle } : null
      );
    } catch {
      visual = null;
    }
  }
  return isObject3DLike(visual)
    ? visual
    : new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.max(
            DRAWER_DIMENSIONS.sketch.rebuiltSegmentVisualMinDimensionM,
            width - DRAWER_DIMENSIONS.sketch.rebuiltSegmentVisualWidthClearanceM
          ),
          Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentVisualMinDimensionM, segHeight),
          thickness
        ),
        segmentPartMat
      );
}
