import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { readMirrorLayoutFaceSign } from '../features/mirror_layout.js';
import { createMirrorDoorVisual } from './visuals_and_contents_door_visual_mirror.js';
import {
  createStyledFullMirrorDoorVisual,
  createStyledMirrorDoorVisual,
} from './visuals_and_contents_door_visual_mirror_styled.js';
import { createDoorVisualPartTagger } from './visuals_and_contents_door_visual_tagging.js';
import {
  createFlatDoorVisual,
  createGlassDoorVisual,
  createProfileDoorVisual,
  createTomDoorVisual,
} from './visuals_and_contents_door_visual_styles.js';
import { __ensureApp, __ensureTHREE, __addOutlines } from './visuals_and_contents_shared.js';

import type { AppContainer, MirrorLayoutList, Object3DLike } from '../../../types/index.js';

function hasExplicitMirrorLayout(mirrorLayout: MirrorLayoutList | null): boolean {
  if (!Array.isArray(mirrorLayout)) return false;
  for (let i = 0; i < mirrorLayout.length; i += 1) {
    const layout = mirrorLayout[i];
    if (
      layout &&
      ((typeof layout.widthCm === 'number' && Number.isFinite(layout.widthCm) && layout.widthCm > 0) ||
        (typeof layout.heightCm === 'number' && Number.isFinite(layout.heightCm) && layout.heightCm > 0))
    ) {
      return true;
    }
  }
  return false;
}

function isFullMirrorLayoutEntry(layout: MirrorLayoutList[number] | null | undefined): boolean {
  if (!layout) return true;
  return !(
    (typeof layout.widthCm === 'number' && Number.isFinite(layout.widthCm) && layout.widthCm > 0) ||
    (typeof layout.heightCm === 'number' && Number.isFinite(layout.heightCm) && layout.heightCm > 0)
  );
}

function hasOutsideFullMirrorLayout(
  mirrorLayout: MirrorLayoutList | null,
  fallbackFaceSign: number
): boolean {
  if (!Array.isArray(mirrorLayout) || !mirrorLayout.length) return true;
  for (let i = 0; i < mirrorLayout.length; i += 1) {
    const layout = mirrorLayout[i];
    if (isFullMirrorLayoutEntry(layout) && readMirrorLayoutFaceSign(layout, fallbackFaceSign) !== -1) {
      return true;
    }
  }
  return false;
}

function hasInsideFullMirrorLayout(mirrorLayout: MirrorLayoutList | null, fallbackFaceSign: number): boolean {
  if (!Array.isArray(mirrorLayout) || !mirrorLayout.length) return false;
  for (let i = 0; i < mirrorLayout.length; i += 1) {
    const layout = mirrorLayout[i];
    if (isFullMirrorLayoutEntry(layout) && readMirrorLayoutFaceSign(layout, fallbackFaceSign) === -1) {
      return true;
    }
  }
  return false;
}

export function createDoorVisual(
  App: AppContainer,
  w: number,
  h: number,
  thickness: number,
  mat: unknown,
  style: unknown,
  hasGrooves = false,
  isMirror = false,
  curtainType: string | null = 'none',
  baseMaterial: unknown | null = null,
  frontFaceSign: number = 1,
  forceCurtainFix: boolean = false,
  mirrorLayout: MirrorLayoutList | null = null,
  groovePartId: string | null = null
): Object3DLike {
  App = __ensureApp(App);
  const THREE = __ensureTHREE(App);
  const addOutlines = (mesh: Object3DLike) => __addOutlines(mesh, App);
  const isSketch = !!readRuntimeScalarOrDefaultFromApp(App, 'sketchMode', false);

  const visualGroup = new THREE.Group();

  // Fail-fast: door style must be resolved from store.ui (no DOM fallbacks).
  if (style == null || String(style).trim() === '') {
    throw new Error(
      '[WardrobePro] Door style is missing (expected ui.doorStyle to be "flat", "profile", or "tom").'
    );
  }
  style = String(style).trim();
  const zSign = frontFaceSign === -1 ? -1 : 1;
  const __forceCurtainFix = !!forceCurtainFix;
  const { tagDoorVisualPart } = createDoorVisualPartTagger({ groovePartId });

  if (isMirror) {
    if (style === 'profile' || style === 'tom') {
      if (hasExplicitMirrorLayout(mirrorLayout)) {
        return createStyledMirrorDoorVisual({
          App,
          THREE,
          style,
          w,
          h,
          thickness,
          mat,
          baseMaterial,
          zSign,
          isSketch,
          mirrorLayout,
          addOutlines,
          tagDoorVisualPart,
        });
      }

      if (
        hasInsideFullMirrorLayout(mirrorLayout, zSign) &&
        !hasOutsideFullMirrorLayout(mirrorLayout, zSign)
      ) {
        return createStyledFullMirrorDoorVisual({
          App,
          THREE,
          style,
          w,
          h,
          thickness,
          mat,
          baseMaterial,
          zSign,
          isSketch,
          mirrorLayout,
          addOutlines,
          tagDoorVisualPart,
        });
      }
    }

    return createMirrorDoorVisual({
      App,
      THREE,
      w,
      h,
      thickness,
      mat,
      baseMaterial,
      zSign,
      isSketch,
      mirrorLayout,
      addOutlines,
    });
  }

  if (style === 'glass') {
    return createGlassDoorVisual({
      App,
      THREE,
      visualGroup,
      addOutlines,
      tagDoorVisualPart,
      isSketch,
      w,
      h,
      thickness,
      mat,
      curtainType,
      zSign,
      forceCurtainFix: __forceCurtainFix,
    });
  }

  if (style === 'flat') {
    return createFlatDoorVisual({
      App,
      THREE,
      visualGroup,
      addOutlines,
      tagDoorVisualPart,
      w,
      h,
      thickness,
      mat,
      hasGrooves,
      groovePartId,
      isSketch,
      zSign,
    });
  }

  if (style === 'profile') {
    return createProfileDoorVisual({
      App,
      THREE,
      visualGroup,
      addOutlines,
      tagDoorVisualPart,
      w,
      h,
      thickness,
      mat,
      hasGrooves,
      groovePartId,
      isSketch,
      zSign,
    });
  }

  if (style === 'tom') {
    return createTomDoorVisual({
      App,
      THREE,
      visualGroup,
      addOutlines,
      tagDoorVisualPart,
      w,
      h,
      thickness,
      mat,
      hasGrooves,
      groovePartId,
      isSketch,
      zSign,
    });
  }

  return new THREE.Group();
}
