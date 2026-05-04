// Post-build sketch external-drawer segmented-door rebuild visual/material helpers (Pure ESM)
//
// Owns per-segment material selection and visual creation for segmented sketch-door rebuild flows.

import { resolveEffectiveDoorStyle } from '../features/door_style_overrides.js';

import { isObject3DLike } from './post_build_extras_shared.js';

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

export function resolveSketchSegmentVisualFlags(args: {
  runtime: SketchDoorCutsRuntime;
  segmentPartId: string;
}): SketchSegmentVisualFlags {
  const { runtime, segmentPartId } = args;
  const { resolveCurtain, resolveSpecial, doorStyle, doorStyleMap, groovesMap, resolveMirrorLayout } =
    runtime;
  const segmentGroovesMap = groovesMap || {};
  const segmentCurtain = resolveCurtain(segmentPartId);
  const segmentSpecial = resolveSpecial(segmentPartId, segmentCurtain);
  const segmentIsMirror = segmentSpecial === 'mirror';
  const segmentIsGlass = segmentSpecial === 'glass';
  const segmentGrooveKey = `groove_${segmentPartId}`;
  const segmentHasGroove = !segmentIsMirror && !segmentIsGlass && segmentGroovesMap[segmentGrooveKey] != null;
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
        Math.max(0.02, width - 0.004),
        Math.max(0.02, segHeight),
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
        new THREE.BoxGeometry(Math.max(0.02, width - 0.004), Math.max(0.02, segHeight), thickness),
        segmentPartMat
      );
}
