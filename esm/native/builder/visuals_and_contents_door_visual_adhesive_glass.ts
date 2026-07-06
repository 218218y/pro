import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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
  baseMaterial: unknown | null;
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
  const baseDoorThick = Math.max(DOOR_VISUAL_DIMENSIONS.mirror.doorThicknessMinM, thickness);
  const glassThick = Math.max(
    DOOR_VISUAL_DIMENSIONS.mirror.mirrorThicknessMinM,
    Math.min(DOOR_VISUAL_DIMENSIONS.glass.paneDepthM, baseDoorThick * 0.28)
  );
  const adhesiveGap = Math.max(
    DOOR_VISUAL_DIMENSIONS.mirror.adhesiveGapMinM,
    Math.min(DOOR_VISUAL_DIMENSIONS.mirror.adhesiveGapMaxM, glassThick * 0.25)
  );
  const glassCenterZ = baseDoorThick / 2 + adhesiveGap + glassThick / 2;
  return { baseDoorThick, glassThick, adhesiveGap, glassCenterZ };
}

function createAdhesiveGlassMaterial(args: { THREE: ThreeLike; kind: AdhesiveGlassKind }) {
  const isBlack = args.kind === 'black_glass';
  const mat = new args.THREE.MeshStandardMaterial({
    color: isBlack ? 0x050608 : 0xe9f2f2,
    transparent: true,
    opacity: isBlack ? 0.82 : 0.58,
    roughness: isBlack ? 0.14 : 0.88,
    metalness: 0.0,
    envMapIntensity: isBlack ? 0.7 : 0.18,
    side: args.THREE.DoubleSide,
  });
  mat.depthWrite = false;
  mat.side = args.THREE.DoubleSide;
  try {
    mat.premultipliedAlpha = true;
  } catch {
    // ignore
  }
  mat.userData = mat.userData || {};
  mat.userData.__wpAdhesiveGlassKind = args.kind;
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
  pane.userData.__doorVisualRole = role;
  applyDoorFaceIdentityMetadata(pane, faceSign);
  applyMirrorPlacementRectMetadata(pane, widthM, heightM);
  tagDoorVisualPart(pane, role);
}

function appendAdhesiveGlassPane(args: {
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
    createAdhesiveGlassMaterial({ THREE: args.THREE, kind: args.kind })
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
  pane.renderOrder = DOOR_VISUAL_DIMENSIONS.glass.paneRenderOrder;
  pane.position.set(args.x, args.y, args.z);
  args.group.add(pane);
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
  const glassWidth = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, args.w - FULL_MIRROR_INSET_M);
  const glassHeight = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    args.h - FULL_MIRROR_INSET_M
  );

  for (let i = 0; i < fullInsideLayouts.length; i += 1) {
    appendAdhesiveGlassPane({
      THREE: args.THREE,
      group: visualGroup,
      kind,
      widthM: glassWidth,
      heightM: glassHeight,
      depthM: depthLayout.glassThick,
      x: 0,
      y: 0,
      z: -(
        Math.max(DOOR_VISUAL_DIMENSIONS.mirror.doorThicknessMinM, args.thickness) / 2 +
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
