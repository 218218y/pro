import {
  readGeometryRuntimeNumber,
  readGeometryRuntimePositiveBoxDimension,
} from './geometry_runtime_contracts.js';
import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { createProfileDoorVisual } from './visuals_and_contents_door_visual_profile.js';
import { createDoubleProfileDoorVisual } from './visuals_and_contents_door_visual_double_profile.js';
import { createMirrorDoorVisual } from './visuals_and_contents_door_visual_mirror.js';
import {
  applyDoorFaceIdentityMetadata,
  readMirrorPlacementRectMetadata,
} from './visuals_and_contents_door_visual_tagging.js';
import { FULL_MIRROR_INSET_M } from '../../shared/mirror_layout_contracts_shared.js';
import { readMirrorLayoutFaceSign, resolveMirrorPlacementListInRect } from '../features/mirror_layout.js';

import type { AppContainer, MirrorLayoutList, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

type MirrorStyledDoorStyle = 'profile' | 'double_profile';

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
  hasGrooves?: boolean;
  groovePartId?: string | null;
  grooveLinesCount?: number | null;
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
function readPanelGeometry(value: Object3DLike): unknown {
  return Reflect.get(value, 'geometry');
}

function resolveMirrorDepthLayout(thickness: number): MirrorDepthLayout {
  const baseDoorThick = Math.max(DOOR_VISUAL_DIMENSIONS.mirror.doorThicknessMinM, thickness);
  const mirrorThick = Math.max(
    DOOR_VISUAL_DIMENSIONS.mirror.mirrorThicknessMinM,
    Math.min(
      DOOR_VISUAL_DIMENSIONS.mirror.mirrorThicknessMaxM,
      baseDoorThick * DOOR_VISUAL_DIMENSIONS.mirror.mirrorThicknessDoorRatio
    )
  );
  const adhesiveGap = Math.max(
    DOOR_VISUAL_DIMENSIONS.mirror.adhesiveGapMinM,
    Math.min(
      DOOR_VISUAL_DIMENSIONS.mirror.adhesiveGapMaxM,
      mirrorThick * DOOR_VISUAL_DIMENSIONS.mirror.adhesiveGapMirrorRatio
    )
  );
  return { mirrorThick, adhesiveGap };
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
    if (width == null || height == null || depth == null) {
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
      hasGrooves: args.hasGrooves === true,
      groovePartId: args.groovePartId ?? null,
      grooveLinesCount: args.grooveLinesCount ?? null,
      tagDoorVisualPart: args.tagDoorVisualPart,
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
    applyDoorFaceIdentityMetadata(mirrorMesh, placementFaceSign);
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
  const mirrorWidth = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    args.w - FULL_MIRROR_INSET_M
  );
  const mirrorHeight = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    args.h - FULL_MIRROR_INSET_M
  );

  for (let i = 0; i < fullInsideLayouts.length; i += 1) {
    const mirrorMesh = new args.THREE.Mesh(
      new args.THREE.BoxGeometry(mirrorWidth, mirrorHeight, depthLayout.mirrorThick),
      args.mat
    );
    mirrorMesh.userData = mirrorMesh.userData || {};
    mirrorMesh.userData.__keepMaterial = true;
    mirrorMesh.userData.__wpMirrorSurface = true;
    mirrorMesh.userData.__doorVisualRole = 'door_mirror_inside_full_panel';
    applyDoorFaceIdentityMetadata(mirrorMesh, -1);
    mirrorMesh.position.set(
      0,
      0,
      -(
        Math.max(DOOR_VISUAL_DIMENSIONS.mirror.doorThicknessMinM, args.thickness) / 2 +
        depthLayout.adhesiveGap +
        depthLayout.mirrorThick / 2
      )
    );
    visualGroup.add(mirrorMesh);
  }

  return visualGroup;
}
