import {
  DOOR_GLASS_RENDER_POLICY,
  DOOR_MIRROR_RENDER_POLICY,
  DOOR_VISUAL_COMMON_POLICY,
} from '../../shared/dimensions/door_visual_policy.js';
import { FULL_MIRROR_INSET_M } from '../../shared/mirror_layout_contracts_shared.js';
import {
  readGeometryRuntimeNumber,
  readGeometryRuntimePositiveBoxDimension,
} from './geometry_runtime_contracts.js';
import {
  readMirrorLayoutFaceSign,
  resolveAdhesiveGlassKind,
  resolveMirrorPlacementListInRect,
  type AdhesiveGlassKind,
} from '../features/door_authoring/api.js';
import { appendGrooveStrips } from './visuals_and_contents_door_visual_grooves.js';
import { getMirrorRenderTarget } from '../runtime/render_access.js';
import { getCacheBag } from '../runtime/cache_access.js';
import { __markMirrorTracked } from './visuals_and_contents_shared.js';
import {
  applyDoorFaceIdentityMetadata,
  applyMirrorPlacementRectMetadata,
  readMirrorPlacementRectMetadata,
} from './visuals_and_contents_door_visual_tagging.js';
import { createProfileDoorVisual } from './visuals_and_contents_door_visual_profile.js';
import { createDoubleProfileDoorVisual } from './visuals_and_contents_door_visual_double_profile.js';

import type { AppContainer, MirrorLayoutList, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

type AddOutlinesFn = (mesh: Object3DLike) => void;

type AdhesiveGlassDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  kind: AdhesiveGlassKind;
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
  tagDoorVisualPart?: TagDoorVisualPartFn | null;
};

type CenterPanelMetrics = {
  panel: Object3DLike;
  width: number;
  height: number;
  depth: number;
  centerZ: number;
  placementRect: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
};

type OverlayDepthLayout = {
  baseDoorThick: number;
  glassThick: number;
  adhesiveGap: number;
  glassCenterZ: number;
};

type BoxGeometryDimensionKey = 'width' | 'height' | 'depth';

function resolveOverlayKind(value: unknown): AdhesiveGlassKind {
  return resolveAdhesiveGlassKind(value) || 'frosted_glass';
}

function resolveOverlayDepthLayout(thickness: number): OverlayDepthLayout {
  const baseDoorThick = Math.max(DOOR_MIRROR_RENDER_POLICY.doorThicknessMinM, thickness);
  const glassThick = Math.max(
    DOOR_MIRROR_RENDER_POLICY.mirrorThicknessMinM,
    Math.min(DOOR_GLASS_RENDER_POLICY.paneDepthM, baseDoorThick * 0.28)
  );
  const adhesiveGap = Math.max(
    DOOR_MIRROR_RENDER_POLICY.adhesiveGapMinM,
    Math.min(DOOR_MIRROR_RENDER_POLICY.adhesiveGapMaxM, glassThick * 0.25)
  );
  const glassCenterZ = baseDoorThick / 2 + adhesiveGap + glassThick / 2;
  return { baseDoorThick, glassThick, adhesiveGap, glassCenterZ };
}

function resolveAdhesiveGlassReflectionProfile(kind: AdhesiveGlassKind): {
  color: number;
  opacity: number;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  reflectionStrength: number;
} {
  if (kind === 'black_glass') {
    return {
      color: 0x050608,
      opacity: 1,
      roughness: 0.18,
      metalness: 0.06,
      envMapIntensity: 0.72,
      reflectionStrength: 0.72,
    };
  }
  return {
    color: 0xe9f2f2,
    opacity: 1,
    roughness: 0.26,
    metalness: 0.04,
    envMapIntensity: 0.46,
    reflectionStrength: 0.46,
  };
}

const ADHESIVE_GLASS_SHADER_PROFILE = 'cube-standard-front-opaque-v5';

type AdhesiveGlassMaterialKind = 'black_glass' | 'frosted_glass';

type AdhesiveGlassMaterialCache = Partial<Record<AdhesiveGlassMaterialKind, unknown>>;

const ADHESIVE_GLASS_MATERIAL_CACHE_KEY = '__wpAdhesiveGlassMaterialCache';

function readAdhesiveGlassMaterialCache(App: AppContainer): AdhesiveGlassMaterialCache {
  const cache = getCacheBag(App) as Record<string, unknown>;
  const existing = cache[ADHESIVE_GLASS_MATERIAL_CACHE_KEY];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    return existing as AdhesiveGlassMaterialCache;
  }
  const next: AdhesiveGlassMaterialCache = Object.create(null) as AdhesiveGlassMaterialCache;
  cache[ADHESIVE_GLASS_MATERIAL_CACHE_KEY] = next;
  return next;
}

function readMirrorRenderTargetTexture(App: AppContainer): unknown {
  try {
    const renderTarget = getMirrorRenderTarget(App) as { texture?: unknown } | null;
    return renderTarget?.texture || null;
  } catch {
    return null;
  }
}

function writeAdhesiveGlassMaterialMetadata(mat: unknown, kind: AdhesiveGlassKind): void {
  const rec = mat && typeof mat === 'object' ? (mat as Record<string, unknown>) : null;
  if (!rec) return;
  rec.__keepMaterial = true;
  const userData =
    rec.userData && typeof rec.userData === 'object' && !Array.isArray(rec.userData)
      ? (rec.userData as Record<string, unknown>)
      : {};
  userData.isCached = true;
  userData.__keepMaterial = true;
  userData.__wpAdhesiveGlassKind = kind;
  userData.__wpAdhesiveGlassReflectionStrength =
    resolveAdhesiveGlassReflectionProfile(kind).reflectionStrength;
  userData.__wpReflectiveAdhesiveGlassMaterial = true;
  userData.__wpAdhesiveGlassShaderProfile = ADHESIVE_GLASS_SHADER_PROFILE;
  rec.userData = userData;
}

function syncAdhesiveGlassMaterialEnvMap(App: AppContainer, mat: unknown): void {
  const rec = mat && typeof mat === 'object' ? (mat as Record<string, unknown>) : null;
  if (!rec) return;
  const mirrorTexture = readMirrorRenderTargetTexture(App);
  if (!mirrorTexture || rec.envMap === mirrorTexture) return;
  rec.envMap = mirrorTexture;
  rec.needsUpdate = true;
}

function readAdhesiveGlassFrontSide(THREE: ThreeLike): unknown {
  return typeof THREE.FrontSide !== 'undefined' ? THREE.FrontSide : THREE.DoubleSide;
}

function isReusableAdhesiveGlassMaterial(mat: unknown, kind: AdhesiveGlassKind): boolean {
  const rec = mat && typeof mat === 'object' ? (mat as Record<string, unknown>) : null;
  if (!rec) return false;
  const userData =
    rec.userData && typeof rec.userData === 'object' && !Array.isArray(rec.userData)
      ? (rec.userData as Record<string, unknown>)
      : null;
  return (
    rec.type === 'MeshStandardMaterial' &&
    userData?.__wpAdhesiveGlassKind === kind &&
    userData.__wpAdhesiveGlassShaderProfile === ADHESIVE_GLASS_SHADER_PROFILE
  );
}

function disposeStaleAdhesiveGlassMaterial(mat: unknown): void {
  const rec = mat && typeof mat === 'object' ? (mat as Record<string, unknown>) : null;
  const dispose = rec?.dispose;
  if (typeof dispose !== 'function') return;
  try {
    dispose.call(rec);
  } catch {
    // Best-effort cleanup only; a stale material must not block rebuilding the door.
  }
}

function createAdhesiveGlassMaterial(args: { App: AppContainer; THREE: ThreeLike; kind: AdhesiveGlassKind }) {
  const cache = readAdhesiveGlassMaterialCache(args.App);
  const cached = cache[args.kind];
  if (cached && isReusableAdhesiveGlassMaterial(cached, args.kind)) {
    syncAdhesiveGlassMaterialEnvMap(args.App, cached);
    writeAdhesiveGlassMaterialMetadata(cached, args.kind);
    return cached;
  }
  if (cached) {
    disposeStaleAdhesiveGlassMaterial(cached);
    delete cache[args.kind];
  }

  const profile = resolveAdhesiveGlassReflectionProfile(args.kind);
  const mirrorTexture = readMirrorRenderTargetTexture(args.App);
  const materialArgs = {
    color: profile.color,
    transparent: false,
    opacity: profile.opacity,
    roughness: profile.roughness,
    metalness: profile.metalness,
    ...(mirrorTexture ? { envMap: mirrorTexture } : null),
    envMapIntensity: profile.envMapIntensity,
    side: readAdhesiveGlassFrontSide(args.THREE),
  };
  const mat = new args.THREE.MeshStandardMaterial(materialArgs);
  mat.transparent = false;
  mat.opacity = profile.opacity;
  mat.roughness = profile.roughness;
  mat.metalness = profile.metalness;
  mat.envMapIntensity = profile.envMapIntensity;
  mat.depthWrite = true;
  mat.side = readAdhesiveGlassFrontSide(args.THREE);
  writeAdhesiveGlassMaterialMetadata(mat, args.kind);
  cache[args.kind] = mat;
  return mat;
}

function tagAdhesiveGlassPane(args: {
  pane: Object3DLike;
  kind: AdhesiveGlassKind;
  faceSign: number;
  widthM: number;
  heightM: number;
  role: string;
  tagDoorVisualPart: TagDoorVisualPartFn;
}): void {
  const { pane, kind, faceSign, widthM, heightM, role, tagDoorVisualPart } = args;
  pane.userData = pane.userData || {};
  pane.userData.__keepMaterial = true;
  pane.userData.__wpAdhesiveGlassSurface = kind;
  pane.userData.__wpMirrorSurface = true;
  pane.userData.__wpMirrorReflectionMode = 'cube';
  pane.userData.__wpReflectiveAdhesiveGlassSurface = true;
  pane.userData.__mirrorWidthM = widthM;
  pane.userData.__mirrorHeightM = heightM;
  pane.userData.__doorVisualRole = role;
  applyDoorFaceIdentityMetadata(pane, faceSign);
  applyMirrorPlacementRectMetadata(pane, widthM, heightM);
  tagDoorVisualPart(pane, role);
}

function appendAdhesiveGlassPane(args: {
  App: AppContainer;
  THREE: ThreeLike;
  group: Object3DLike;
  kind: AdhesiveGlassKind;
  widthM: number;
  heightM: number;
  depthM: number;
  x: number;
  y: number;
  z: number;
  faceSign: number;
  role: string;
  tagDoorVisualPart: TagDoorVisualPartFn;
}): Object3DLike {
  const pane = new args.THREE.Mesh(
    new args.THREE.BoxGeometry(args.widthM, args.heightM, args.depthM),
    createAdhesiveGlassMaterial({ App: args.App, THREE: args.THREE, kind: args.kind })
  );
  tagAdhesiveGlassPane({
    pane,
    kind: args.kind,
    faceSign: args.faceSign,
    widthM: args.widthM,
    heightM: args.heightM,
    role: args.role,
    tagDoorVisualPart: args.tagDoorVisualPart,
  });
  pane.renderOrder = DOOR_GLASS_RENDER_POLICY.paneRenderOrder;
  pane.position.set(args.x, args.y, args.z);
  args.group.add(pane);
  try {
    __markMirrorTracked(args.App, pane);
  } catch {
    // Cube reflection tracking is best-effort; the pane itself remains a valid glass overlay.
  }
  return pane;
}

function readPanelGeometry(value: Object3DLike): unknown {
  return Reflect.get(value, 'geometry');
}

function readBoxGeometryDimension(
  geometry: unknown,
  index: number,
  key: BoxGeometryDimensionKey
): number | null {
  return readGeometryRuntimePositiveBoxDimension(geometry, index, key);
}

function readCenterPanelMetrics(group: Object3DLike, role: string): CenterPanelMetrics | null {
  for (let i = 0; i < group.children.length; i += 1) {
    const child = group.children[i];
    if (child.userData.__doorVisualRole !== role) continue;

    const geometry = readPanelGeometry(child);
    const width = readBoxGeometryDimension(geometry, 0, 'width');
    const height = readBoxGeometryDimension(geometry, 1, 'height');
    const depth = readBoxGeometryDimension(geometry, 2, 'depth');
    const centerZ = readGeometryRuntimeNumber(child.position?.z) ?? 0;
    if (width == null || height == null || depth == null) continue;
    return {
      panel: child,
      width,
      height,
      depth,
      centerZ,
      placementRect: readMirrorPlacementRectMetadata(child) || {
        minX: -width / 2,
        maxX: width / 2,
        minY: -height / 2,
        maxY: height / 2,
      },
    };
  }
  return null;
}

function buildStyledDoorFrame(args: AdhesiveGlassDoorVisualArgs & { style: 'profile' | 'double_profile' }): {
  visualGroup: Object3DLike;
  center: CenterPanelMetrics | null;
} {
  const visualGroup = new args.THREE.Group();
  const frameMaterial =
    args.baseMaterial || args.mat || new args.THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const tagDoorVisualPart: TagDoorVisualPartFn =
    typeof args.tagDoorVisualPart === 'function' ? args.tagDoorVisualPart : (_node, _role) => undefined;
  const sharedStyleArgs = {
    App: args.App,
    THREE: args.THREE,
    visualGroup,
    addOutlines: args.addOutlines as StyledDoorVisualArgs['addOutlines'],
    tagDoorVisualPart,
    w: args.w,
    h: args.h,
    thickness: args.thickness,
    mat: frameMaterial,
    hasGrooves: args.hasGrooves === true,
    groovePartId: args.groovePartId ?? null,
    grooveLinesCount: args.grooveLinesCount ?? null,
    isSketch: args.isSketch,
    zSign: args.zSign,
  } as const;

  if (args.style === 'profile') createProfileDoorVisual(sharedStyleArgs);
  else createDoubleProfileDoorVisual(sharedStyleArgs);

  const centerRole =
    args.style === 'profile' ? 'door_profile_center_panel' : 'door_double_profile_center_panel';
  const center = readCenterPanelMetrics(visualGroup, centerRole);
  return { visualGroup, center };
}

export function createAdhesiveGlassDoorVisual(args: AdhesiveGlassDoorVisualArgs): Object3DLike {
  const kind = resolveOverlayKind(args.kind);
  const tagDoorVisualPart: TagDoorVisualPartFn =
    typeof args.tagDoorVisualPart === 'function' ? args.tagDoorVisualPart : (_node, _visualRole) => undefined;
  const visualGroup = new args.THREE.Group();
  const woodMat = args.baseMaterial || args.mat || new args.THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const depthLayout = resolveOverlayDepthLayout(args.thickness);
  const placementLayouts =
    Array.isArray(args.mirrorLayout) && args.mirrorLayout.length ? args.mirrorLayout : [null];
  const placements = resolveMirrorPlacementListInRect({
    rect: { minX: -args.w / 2, maxX: args.w / 2, minY: -args.h / 2, maxY: args.h / 2 },
    layouts: placementLayouts,
  });

  const woodMesh = new args.THREE.Mesh(
    new args.THREE.BoxGeometry(args.w, args.h, depthLayout.baseDoorThick),
    woodMat
  );
  woodMesh.position.z = 0;
  tagDoorVisualPart(woodMesh, 'door_adhesive_glass_base');
  if (typeof args.addOutlines === 'function') args.addOutlines(woodMesh);
  visualGroup.add(woodMesh);
  appendGrooveStrips({
    App: args.App,
    THREE: args.THREE,
    visualGroup,
    tagDoorVisualPart,
    hasGrooves: args.hasGrooves === true,
    isSketch: args.isSketch,
    groovePartId: args.groovePartId ?? null,
    zSign: args.zSign,
    targetW: args.w,
    targetH: args.h,
    zOffset: (depthLayout.baseDoorThick / 2) * args.zSign,
    linesCountOverride: args.grooveLinesCount ?? null,
  });

  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const placementLayout = i < placementLayouts.length ? placementLayouts[i] : null;
    const faceSign = readMirrorLayoutFaceSign(placementLayout, args.zSign);
    appendAdhesiveGlassPane({
      App: args.App,
      THREE: args.THREE,
      group: visualGroup,
      kind,
      widthM: placement.mirrorWidthM,
      heightM: placement.mirrorHeightM,
      depthM: depthLayout.glassThick,
      x: placement.offsetX,
      y: placement.offsetY,
      z: depthLayout.glassCenterZ * faceSign,
      faceSign,
      role: 'door_adhesive_glass_surface',
      tagDoorVisualPart,
    });
  }

  return visualGroup;
}

export function createStyledAdhesiveGlassDoorVisual(
  args: AdhesiveGlassDoorVisualArgs & { style: 'profile' | 'double_profile' }
): Object3DLike {
  const kind = resolveOverlayKind(args.kind);
  const { visualGroup, center } = buildStyledDoorFrame(args);
  if (!center) return createAdhesiveGlassDoorVisual(args);

  const tagDoorVisualPart: TagDoorVisualPartFn =
    typeof args.tagDoorVisualPart === 'function' ? args.tagDoorVisualPart : (_node, _visualRole) => undefined;
  const placementLayouts =
    Array.isArray(args.mirrorLayout) && args.mirrorLayout.length ? args.mirrorLayout : [null];
  const placements = resolveMirrorPlacementListInRect({
    rect: center.placementRect,
    layouts: placementLayouts,
  });
  const depthLayout = resolveOverlayDepthLayout(args.thickness);

  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const placementLayout = i < placementLayouts.length ? placementLayouts[i] : null;
    const faceSign = readMirrorLayoutFaceSign(placementLayout, args.zSign);
    appendAdhesiveGlassPane({
      App: args.App,
      THREE: args.THREE,
      group: center.panel,
      kind,
      widthM: placement.mirrorWidthM,
      heightM: placement.mirrorHeightM,
      depthM: depthLayout.glassThick,
      x: placement.offsetX,
      y: placement.offsetY,
      z: (center.depth / 2 + depthLayout.adhesiveGap + depthLayout.glassThick / 2) * faceSign,
      faceSign,
      role: 'door_adhesive_glass_center_panel',
      tagDoorVisualPart,
    });
  }

  return visualGroup;
}

export function createStyledFullAdhesiveGlassDoorVisual(
  args: AdhesiveGlassDoorVisualArgs & { style: 'profile' | 'double_profile' }
): Object3DLike {
  const kind = resolveOverlayKind(args.kind);
  const { visualGroup } = buildStyledDoorFrame(args);
  const tagDoorVisualPart: TagDoorVisualPartFn =
    typeof args.tagDoorVisualPart === 'function' ? args.tagDoorVisualPart : (_node, _visualRole) => undefined;
  const layoutList = Array.isArray(args.mirrorLayout) && args.mirrorLayout.length ? args.mirrorLayout : [];
  const fullInsideLayouts = layoutList.filter(layout => readMirrorLayoutFaceSign(layout, args.zSign) === -1);
  const depthLayout = resolveOverlayDepthLayout(args.thickness);
  const glassWidth = Math.max(DOOR_VISUAL_COMMON_POLICY.minPanelDimensionM, args.w - FULL_MIRROR_INSET_M);
  const glassHeight = Math.max(DOOR_VISUAL_COMMON_POLICY.minPanelDimensionM, args.h - FULL_MIRROR_INSET_M);

  for (let i = 0; i < fullInsideLayouts.length; i += 1) {
    appendAdhesiveGlassPane({
      App: args.App,
      THREE: args.THREE,
      group: visualGroup,
      kind,
      widthM: glassWidth,
      heightM: glassHeight,
      depthM: depthLayout.glassThick,
      x: 0,
      y: 0,
      z: -(
        Math.max(DOOR_MIRROR_RENDER_POLICY.doorThicknessMinM, args.thickness) / 2 +
        depthLayout.adhesiveGap +
        depthLayout.glassThick / 2
      ),
      faceSign: -1,
      role: 'door_adhesive_glass_inside_full_panel',
      tagDoorVisualPart,
    });
  }

  return visualGroup;
}
