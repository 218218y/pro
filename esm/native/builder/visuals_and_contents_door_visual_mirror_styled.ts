import { createProfileDoorVisual } from './visuals_and_contents_door_visual_profile.js';
import { createTomDoorVisual } from './visuals_and_contents_door_visual_tom.js';
import { createMirrorDoorVisual } from './visuals_and_contents_door_visual_mirror.js';
import { readMirrorPlacementRectMetadata } from './visuals_and_contents_door_visual_tagging.js';
import { FULL_MIRROR_INSET_M } from '../../shared/mirror_layout_contracts_shared.js';
import { readMirrorLayoutFaceSign, resolveMirrorPlacementListInRect } from '../features/mirror_layout.js';

import type {
  AppContainer,
  MirrorLayoutList,
  Object3DLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';
import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

type MirrorStyledDoorStyle = 'profile' | 'tom';

type CreateStyledMirrorDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  style: MirrorStyledDoorStyle;
  w: number;
  h: number;
  thickness: number;
  mat: unknown;
  baseMaterial: unknown | null;
  zSign: number;
  isSketch: boolean;
  mirrorLayout: MirrorLayoutList | null;
  addOutlines: StyledDoorVisualArgs['addOutlines'];
  tagDoorVisualPart: StyledDoorVisualArgs['tagDoorVisualPart'];
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

type MirrorDepthLayout = {
  mirrorThick: number;
  adhesiveGap: number;
};

type BoxGeometryDimensionKey = 'width' | 'height' | 'depth';
type BoxGeometryLike = {
  args?: unknown[];
  parameters?: Partial<Record<BoxGeometryDimensionKey, unknown>>;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readBoxGeometryLike(value: unknown): BoxGeometryLike | null {
  if (!isRecord(value)) return null;
  const args = Array.isArray(value.args) ? value.args : undefined;
  const parameters = isRecord(value.parameters) ? value.parameters : undefined;
  return { args, parameters };
}

function readPanelGeometry(value: Object3DLike): unknown {
  return Reflect.get(value, 'geometry');
}

function resolveMirrorDepthLayout(thickness: number): MirrorDepthLayout {
  const baseDoorThick = Math.max(0.002, thickness);
  const mirrorThick = Math.max(0.002, Math.min(0.004, baseDoorThick * 0.35));
  const adhesiveGap = Math.max(0.0006, Math.min(0.0012, mirrorThick * 0.3));
  return { mirrorThick, adhesiveGap };
}

function readBoxGeometryDimension(geometry: unknown, index: number, key: BoxGeometryDimensionKey): number {
  const rec = readBoxGeometryLike(geometry);
  const argsValue = typeof rec?.args?.[index] === 'number' ? Number(rec.args[index]) : NaN;
  if (Number.isFinite(argsValue) && argsValue > 0) return argsValue;

  const parameterValue = typeof rec?.parameters?.[key] === 'number' ? Number(rec.parameters[key]) : NaN;
  return Number.isFinite(parameterValue) && parameterValue > 0 ? parameterValue : NaN;
}

function readCenterPanelMetrics(group: Object3DLike, role: string): CenterPanelMetrics | null {
  for (let i = 0; i < group.children.length; i += 1) {
    const child = group.children[i];
    if (child.userData.__doorVisualRole !== role) continue;

    const geometry = readPanelGeometry(child);
    const width = readBoxGeometryDimension(geometry, 0, 'width');
    const height = readBoxGeometryDimension(geometry, 1, 'height');
    const depth = readBoxGeometryDimension(geometry, 2, 'depth');
    const centerZ = Number(child.position.z) || 0;
    if (
      !(
        Number.isFinite(width) &&
        width > 0 &&
        Number.isFinite(height) &&
        height > 0 &&
        Number.isFinite(depth) &&
        depth > 0
      )
    ) {
      continue;
    }
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

function buildStyledDoorFrame(args: CreateStyledMirrorDoorVisualArgs): {
  visualGroup: Object3DLike;
  center: CenterPanelMetrics | null;
} {
  const visualGroup = new args.THREE.Group();
  const frameMaterial = args.baseMaterial || new args.THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const sharedStyleArgs = {
    App: args.App,
    THREE: args.THREE,
    visualGroup,
    addOutlines: args.addOutlines,
    tagDoorVisualPart: args.tagDoorVisualPart,
    w: args.w,
    h: args.h,
    thickness: args.thickness,
    mat: frameMaterial,
    hasGrooves: false,
    groovePartId: null,
    isSketch: args.isSketch,
    zSign: args.zSign,
  } as const;

  if (args.style === 'profile') createProfileDoorVisual(sharedStyleArgs);
  else createTomDoorVisual(sharedStyleArgs);

  const centerRole = args.style === 'profile' ? 'door_profile_center_panel' : 'door_tom_center_panel';
  const center = readCenterPanelMetrics(visualGroup, centerRole);
  return { visualGroup, center };
}

export function createStyledMirrorDoorVisual(args: CreateStyledMirrorDoorVisualArgs): Object3DLike {
  const { visualGroup, center } = buildStyledDoorFrame(args);
  if (!center) {
    return createMirrorDoorVisual({
      App: args.App,
      THREE: args.THREE,
      w: args.w,
      h: args.h,
      thickness: args.thickness,
      mat: args.mat,
      baseMaterial: args.baseMaterial,
      zSign: args.zSign,
      isSketch: args.isSketch,
      mirrorLayout: args.mirrorLayout,
      addOutlines: args.addOutlines,
    });
  }

  const placementLayouts =
    Array.isArray(args.mirrorLayout) && args.mirrorLayout.length ? args.mirrorLayout : [null];
  const placements = resolveMirrorPlacementListInRect({
    rect: center.placementRect,
    layouts: placementLayouts,
  });
  const depthLayout = resolveMirrorDepthLayout(args.thickness);

  for (let i = 0; i < placements.length; i += 1) {
    const placement = placements[i];
    const placementLayout = i < placementLayouts.length ? placementLayouts[i] : null;
    const placementFaceSign = readMirrorLayoutFaceSign(placementLayout, args.zSign);
    const mirrorMesh = new args.THREE.Mesh(
      new args.THREE.BoxGeometry(placement.mirrorWidthM, placement.mirrorHeightM, depthLayout.mirrorThick),
      args.mat
    );
    mirrorMesh.userData = mirrorMesh.userData || {};
    mirrorMesh.userData.__keepMaterial = true;
    mirrorMesh.userData.__wpMirrorSurface = true;
    args.tagDoorVisualPart(mirrorMesh, 'door_mirror_center_panel');
    mirrorMesh.position.set(
      placement.offsetX,
      placement.offsetY,
      (center.depth / 2 + depthLayout.adhesiveGap + depthLayout.mirrorThick / 2) * placementFaceSign
    );
    center.panel.add(mirrorMesh);
  }

  return visualGroup;
}

export function createStyledFullMirrorDoorVisual(args: CreateStyledMirrorDoorVisualArgs): Object3DLike {
  const { visualGroup } = buildStyledDoorFrame(args);
  const layoutList = Array.isArray(args.mirrorLayout) && args.mirrorLayout.length ? args.mirrorLayout : [];
  const fullInsideLayouts = layoutList.filter(layout => readMirrorLayoutFaceSign(layout, args.zSign) === -1);
  const depthLayout = resolveMirrorDepthLayout(args.thickness);
  const mirrorWidth = Math.max(0.02, args.w - FULL_MIRROR_INSET_M);
  const mirrorHeight = Math.max(0.02, args.h - FULL_MIRROR_INSET_M);

  for (let i = 0; i < fullInsideLayouts.length; i += 1) {
    const mirrorMesh = new args.THREE.Mesh(
      new args.THREE.BoxGeometry(mirrorWidth, mirrorHeight, depthLayout.mirrorThick),
      args.mat
    );
    mirrorMesh.userData = mirrorMesh.userData || {};
    mirrorMesh.userData.__keepMaterial = true;
    mirrorMesh.userData.__wpMirrorSurface = true;
    mirrorMesh.userData.__doorVisualRole = 'door_mirror_inside_full_panel';
    mirrorMesh.position.set(
      0,
      0,
      -(Math.max(0.002, args.thickness) / 2 + depthLayout.adhesiveGap + depthLayout.mirrorThick / 2)
    );
    visualGroup.add(mirrorMesh);
  }

  return visualGroup;
}
