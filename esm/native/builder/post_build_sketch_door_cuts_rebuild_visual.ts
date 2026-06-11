// Post-build sketch external-drawer segmented-door rebuild visual/material helpers (Pure ESM)
//
// Owns per-segment material selection and visual creation for segmented sketch-door rebuild flows.

import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';
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

function readSketchDoorBasePartId(partId: string): string {
  return String(partId || '').replace(/_(?:full|top|bot|mid\d*)$/i, '');
}

function hasOwnSketchSegmentGroove(map: ValueRecord | null | undefined, key: string): boolean {
  return !!map && !!key && Object.prototype.hasOwnProperty.call(map, key) && map[key] != null;
}

function isSketchBoxDoorSegmentPartId(partId: string): boolean {
  return /^sketch_box(?:_free)?_.+_door(?:_|$)/.test(String(partId || ''));
}

function hasAnySketchBoxSegmentGroove(map: ValueRecord | null | undefined, basePartId: string): boolean {
  if (!map || !basePartId) return false;
  const prefixed = `groove_${basePartId}_`;
  const raw = `${basePartId}_`;
  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (map[key] == null) continue;
    if (key.startsWith(prefixed) || key.startsWith(raw)) return true;
  }
  return false;
}

function readSketchSegmentGrooveEnabled(args: {
  groovesMap: ValueRecord | null | undefined;
  segmentPartId: string;
  sourceUserData?: ValueRecord | null;
}): boolean {
  const { groovesMap, segmentPartId, sourceUserData } = args;
  const basePartId = readSketchDoorBasePartId(segmentPartId);
  const isSketchBoxDoorSegment =
    isSketchBoxDoorSegmentPartId(segmentPartId) || sourceUserData?.__wpSketchBoxDoor === true;

  if (isSketchBoxDoorSegment) {
    const sketchBoxSegmentKeys = [`groove_${segmentPartId}`, segmentPartId];
    for (let i = 0; i < sketchBoxSegmentKeys.length; i += 1) {
      if (hasOwnSketchSegmentGroove(groovesMap, sketchBoxSegmentKeys[i])) return true;
    }
    if (hasAnySketchBoxSegmentGroove(groovesMap, basePartId)) return false;
    return sourceUserData?.__wpSketchBoxDoorGroove === true;
  }

  if (sourceUserData && sourceUserData.__wpSketchBoxDoorGroove === true) return true;
  const keys = [
    `groove_${segmentPartId}`,
    segmentPartId,
    basePartId ? `groove_${basePartId}` : '',
    basePartId,
    basePartId ? `groove_${basePartId}_full` : '',
    basePartId ? `${basePartId}_full` : '',
  ];
  for (let i = 0; i < keys.length; i += 1) {
    if (hasOwnSketchSegmentGroove(groovesMap, keys[i])) return true;
  }
  return false;
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
