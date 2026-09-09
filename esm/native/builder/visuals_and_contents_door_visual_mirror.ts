// Native Builder Door Visuals (ESM) — Mirror
//
// Owns the mirror-door construction path (wood backing + one-or-many mirror placements).
// Kept separate so the canonical `createDoorVisual(...)` seam stays readable.

import { createCanvasViaPlatform } from '../runtime/platform_access.js';
import { installPlanarMirrorReflector } from '../runtime/render_access.js';
import { DOOR_MIRROR_RENDER_POLICY } from '../../shared/dimensions/door_visual_policy.js';
import { getCacheBag } from '../runtime/cache_access.js';
import {
  readMirrorLayoutFaceSign,
  resolveMirrorPlacementListInRect,
} from '../features/door_authoring/api.js';
import { appendGrooveStrips } from './visuals_and_contents_door_visual_grooves.js';
import { applyDoorFaceIdentityMetadata } from './visuals_and_contents_door_visual_tagging.js';
import { __asCanvas, __markMirrorTracked } from './visuals_and_contents_shared.js';

import type {
  AppContainer,
  BuilderMirrorReflectorProfile,
  GrooveLayoutList,
  MirrorLayoutList,
  Object3DLike,
  ThreeLike,
} from '../../../types/index.js';
import type { CanvasLike } from './visuals_and_contents_shared.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

type AddOutlinesFn = (mesh: Object3DLike) => void;

type MirrorDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  w: number;
  h: number;
  thickness: number;
  mat: unknown;
  baseMaterial: unknown;
  zSign: number;
  isSketch: boolean;
  mirrorLayout: MirrorLayoutList | null;
  addOutlines: AddOutlinesFn;
  hasGrooves?: boolean;
  groovePartId?: string | null;
  grooveLinesCount?: number | null;
  grooveLayout?: GrooveLayoutList | null;
  tagDoorVisualPart?: TagDoorVisualPartFn | null;
  mirrorReflectorProfile?: BuilderMirrorReflectorProfile | null;
};

function getOrCreateSketchPatternCanvas(App: AppContainer, _THREE: ThreeLike): CanvasLike | null {
  // Cache on the runtime cache bag to avoid re-drawing the pattern for every mirror placement.
  // (We still create per-marking textures because texture repeat differs per placement.)
  const cache = getCacheBag(App);
  const key = '__wpDoorMirrorSketchPatternCanvas';
  const existing = __asCanvas(cache[key]);
  if (existing) return existing;

  const canvas = __asCanvas(createCanvasViaPlatform(App, 128, 128));
  if (!canvas) return null;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = -128; j < 256; j += 30) {
      ctx.moveTo(j, 0);
      ctx.lineTo(j + 128, 128);
    }
    ctx.stroke();
  } catch {
    // If drawing fails, skip caching and let callers continue without sketch markings.
    return null;
  }

  try {
    if (cache) cache[key] = canvas;
  } catch {
    // builder-cache-write-fallback: mirror-canvas caching is an optimization and must not block visual creation
  }
  return canvas;
}

type MirrorDoorDepthLayout = {
  baseDoorThick: number;
  mirrorThick: number;
  adhesiveGap: number;
  mirrorCenterZ: number;
  mirrorFrontZ: number;
};

export function resolveMirrorDoorDepthLayout(thickness: number): MirrorDoorDepthLayout {
  const baseDoorThick = Math.max(DOOR_MIRROR_RENDER_POLICY.doorThicknessMinM, thickness);
  const mirrorThick = Math.max(
    DOOR_MIRROR_RENDER_POLICY.mirrorThicknessMinM,
    Math.min(
      DOOR_MIRROR_RENDER_POLICY.mirrorThicknessMaxM,
      baseDoorThick * DOOR_MIRROR_RENDER_POLICY.mirrorThicknessDoorRatio
    )
  );
  const adhesiveGap = Math.max(
    DOOR_MIRROR_RENDER_POLICY.adhesiveGapMinM,
    Math.min(
      DOOR_MIRROR_RENDER_POLICY.adhesiveGapMaxM,
      mirrorThick * DOOR_MIRROR_RENDER_POLICY.adhesiveGapMirrorRatio
    )
  );
  const mirrorCenterZ = baseDoorThick / 2 + adhesiveGap + mirrorThick / 2;
  const mirrorFrontZ = baseDoorThick / 2 + adhesiveGap + mirrorThick;
  return { baseDoorThick, mirrorThick, adhesiveGap, mirrorCenterZ, mirrorFrontZ };
}

function writeFiniteMirrorProfileNumber(
  userData: Object3DLike['userData'],
  key: string,
  value: unknown
): void {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  if (Number.isFinite(num)) userData[key] = num;
}

export function appendMirrorDoorSurfacePlacement(args: {
  App: AppContainer;
  THREE: ThreeLike;
  parent: Object3DLike;
  mat: unknown;
  placement: {
    mirrorWidthM: number;
    mirrorHeightM: number;
    offsetX: number;
    offsetY: number;
  };
  placementLayout: MirrorLayoutList[number] | null;
  placementIndex: number;
  baseHalfDepthM: number;
  thickness: number;
  zSign: number;
  isSketch: boolean;
  role: string;
  groovePartId?: string | null;
  tagDoorVisualPart?: TagDoorVisualPartFn | null;
  mirrorReflectorProfile?: BuilderMirrorReflectorProfile | null;
}): Object3DLike {
  const tagDoorVisualPart: TagDoorVisualPartFn =
    typeof args.tagDoorVisualPart === 'function' ? args.tagDoorVisualPart : (_node, _visualRole) => undefined;
  const depthLayout = resolveMirrorDoorDepthLayout(args.thickness);
  const placementFaceSign = readMirrorLayoutFaceSign(args.placementLayout, args.zSign);
  const surfaceCenterZ = args.baseHalfDepthM + depthLayout.adhesiveGap + depthLayout.mirrorThick / 2;
  const mirrorMesh = new args.THREE.Mesh(
    new args.THREE.BoxGeometry(
      args.placement.mirrorWidthM,
      args.placement.mirrorHeightM,
      depthLayout.mirrorThick
    ),
    args.mat
  );
  mirrorMesh.userData = mirrorMesh.userData || {};
  mirrorMesh.userData.__keepMaterial = true;
  mirrorMesh.userData.__wpMirrorSurface = true;
  applyDoorFaceIdentityMetadata(mirrorMesh, placementFaceSign);
  applyMirrorReflectorProfileMetadata(mirrorMesh, args.mirrorReflectorProfile);
  applyMirrorReflectorIdentityMetadata(mirrorMesh, {
    ...(args.groovePartId !== undefined ? { ownerPartId: args.groovePartId } : {}),
    role: args.role,
    placementIndex: args.placementIndex,
    faceSign: placementFaceSign,
    widthM: args.placement.mirrorWidthM,
    heightM: args.placement.mirrorHeightM,
    offsetX: args.placement.offsetX,
    offsetY: args.placement.offsetY,
    profile: args.mirrorReflectorProfile ?? null,
  });
  tagDoorVisualPart(mirrorMesh, args.role);
  mirrorMesh.position.set(args.placement.offsetX, args.placement.offsetY, surfaceCenterZ * placementFaceSign);
  try {
    installPlanarMirrorReflector(args.App, args.THREE, mirrorMesh, {
      faceSign: placementFaceSign,
      sketchMode: args.isSketch,
    });
  } catch {
    // Keep the existing envMap mirror material for cube mode.
  }
  args.parent.add(mirrorMesh);
  try {
    __markMirrorTracked(args.App, mirrorMesh);
  } catch {
    // Best-effort only.
  }

  if (args.isSketch) {
    const sketchCanvas = getOrCreateSketchPatternCanvas(args.App, args.THREE);
    if (sketchCanvas) {
      try {
        const tex = new args.THREE.CanvasTexture(sketchCanvas);
        tex.wrapS = args.THREE.RepeatWrapping;
        tex.wrapT = args.THREE.RepeatWrapping;
        tex.repeat.set(
          Math.max(0.25, args.placement.mirrorWidthM * 3),
          Math.max(0.25, args.placement.mirrorHeightM * 3)
        );
        const markGeo = new args.THREE.PlaneGeometry(
          args.placement.mirrorWidthM,
          args.placement.mirrorHeightM
        );
        const markMat = new args.THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.3,
          side: args.THREE.DoubleSide,
        });
        const marking = new args.THREE.Mesh(markGeo, markMat);
        marking.userData = marking.userData || {};
        marking.userData.__keepMaterial = true;
        applyDoorFaceIdentityMetadata(marking, placementFaceSign);
        marking.position.set(
          args.placement.offsetX,
          args.placement.offsetY,
          (args.baseHalfDepthM + depthLayout.adhesiveGap + depthLayout.mirrorThick + 0.001) *
            placementFaceSign
        );
        args.parent.add(marking);
      } catch {
        // ignore sketch markings
      }
    }
  }

  return mirrorMesh;
}

export function applyMirrorReflectorProfileMetadata(
  mirrorMesh: Object3DLike,
  profile: BuilderMirrorReflectorProfile | null | undefined
): void {
  if (!profile || profile.slidingLane == null) return;
  const lane = profile.slidingLane === 'inner' ? 'inner' : profile.slidingLane === 'outer' ? 'outer' : null;
  if (!lane) return;
  mirrorMesh.userData = mirrorMesh.userData || {};
  mirrorMesh.userData.__wpMirrorSlidingLane = lane;
  writeFiniteMirrorProfileNumber(mirrorMesh.userData, '__wpMirrorSlidingDoorIndex', profile.slidingDoorIndex);
  writeFiniteMirrorProfileNumber(mirrorMesh.userData, '__wpMirrorSlidingDoorTotal', profile.slidingDoorTotal);
  writeFiniteMirrorProfileNumber(
    mirrorMesh.userData,
    '__wpMirrorSlidingDoorWidthM',
    profile.slidingDoorWidthM
  );
}

function formatMirrorIdentityNumber(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num.toFixed(4) : 'na';
}

export function applyMirrorReflectorIdentityMetadata(
  mirrorMesh: Object3DLike,
  args: {
    ownerPartId?: string | null;
    role: string;
    placementIndex: number;
    faceSign: number;
    widthM: number;
    heightM: number;
    offsetX?: number | null;
    offsetY?: number | null;
    profile?: BuilderMirrorReflectorProfile | null;
  }
): void {
  mirrorMesh.userData = mirrorMesh.userData || {};
  const userData = mirrorMesh.userData;
  const ownerPartId =
    typeof args.ownerPartId === 'string' && args.ownerPartId ? args.ownerPartId : 'unknown-door';
  const faceSign = args.faceSign < 0 ? -1 : 1;
  const slidingLane =
    args.profile?.slidingLane === 'inner'
      ? 'inner'
      : args.profile?.slidingLane === 'outer'
        ? 'outer'
        : 'none';
  const slidingIndex = Number.isFinite(Number(args.profile?.slidingDoorIndex))
    ? String(Math.floor(Number(args.profile?.slidingDoorIndex)))
    : 'na';

  userData.__mirrorWidthM = args.widthM;
  userData.__mirrorHeightM = args.heightM;
  userData.__wpPlanarReflectorCacheKey = [
    'door-mirror',
    ownerPartId,
    args.role || 'mirror',
    String(Math.max(0, Math.floor(Number(args.placementIndex) || 0))),
    String(faceSign),
    formatMirrorIdentityNumber(args.widthM),
    formatMirrorIdentityNumber(args.heightM),
    formatMirrorIdentityNumber(args.offsetX || 0),
    formatMirrorIdentityNumber(args.offsetY || 0),
    slidingLane,
    slidingIndex,
  ].join('|');
}

export function createMirrorDoorVisual(args: MirrorDoorVisualArgs): Object3DLike {
  const { App, THREE, w, h, thickness, mat, baseMaterial, zSign, isSketch, mirrorLayout, addOutlines } = args;
  const tagDoorVisualPart: TagDoorVisualPartFn =
    typeof args.tagDoorVisualPart === 'function' ? args.tagDoorVisualPart : (_node, _visualRole) => undefined;

  const visualGroup = new THREE.Group();
  const woodMat = baseMaterial || new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const depthLayout = resolveMirrorDoorDepthLayout(thickness);
  const placementLayouts = Array.isArray(mirrorLayout) && mirrorLayout.length ? mirrorLayout : [null];
  const placements = resolveMirrorPlacementListInRect({
    rect: { minX: -w / 2, maxX: w / 2, minY: -h / 2, maxY: h / 2 },
    layouts: placementLayouts,
  });

  const woodMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, depthLayout.baseDoorThick), woodMat);
  woodMesh.position.z = 0;
  if (typeof addOutlines === 'function') addOutlines(woodMesh);
  visualGroup.add(woodMesh);
  appendGrooveStrips({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    hasGrooves: args.hasGrooves === true,
    isSketch,
    groovePartId: args.groovePartId ?? null,
    zSign,
    targetW: w,
    targetH: h,
    zOffset: (depthLayout.baseDoorThick / 2) * zSign,
    linesCountOverride: args.grooveLinesCount ?? null,
    grooveLayout: args.grooveLayout ?? null,
  });

  for (const [i, placement] of placements.entries()) {
    appendMirrorDoorSurfacePlacement({
      App,
      THREE,
      parent: visualGroup,
      mat,
      placement,
      placementLayout: placementLayouts[i] ?? null,
      placementIndex: i,
      baseHalfDepthM: depthLayout.baseDoorThick / 2,
      thickness,
      zSign,
      isSketch,
      role: 'door_mirror_surface',
      groovePartId: args.groovePartId ?? null,
      tagDoorVisualPart,
      mirrorReflectorProfile: args.mirrorReflectorProfile ?? null,
    });
  }

  return visualGroup;
}
