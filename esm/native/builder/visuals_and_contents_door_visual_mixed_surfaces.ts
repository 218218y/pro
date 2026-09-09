import { appendMirrorDoorSurfaceLayoutPlacement } from './visuals_and_contents_door_visual_mirror.js';
import { appendAdhesiveGlassLayoutPlacement } from './visuals_and_contents_door_visual_adhesive_glass.js';
import { createFlatDoorVisual } from './visuals_and_contents_door_visual_flat.js';
import { createProfileDoorVisual } from './visuals_and_contents_door_visual_profile.js';
import { createDoubleProfileDoorVisual } from './visuals_and_contents_door_visual_double_profile.js';
import { readGeometryRuntimePositiveBoxDimension } from './geometry_runtime_contracts.js';
import { readMirrorPlacementRectMetadata } from './visuals_and_contents_door_visual_tagging.js';

import type {
  AppContainer,
  BuilderMirrorReflectorProfile,
  GrooveLayoutList,
  MirrorLayoutList,
  Object3DLike,
  ThreeLike,
} from '../../../types/index.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

type MixedSurfaceStyle = 'flat' | 'profile' | 'double_profile';

type CenterPanelTarget = {
  parent: Object3DLike;
  rect: { minX: number; maxX: number; minY: number; maxY: number };
  baseHalfDepthM: number;
};

export type MixedSurfaceDoorVisualArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  style: MixedSurfaceStyle;
  w: number;
  h: number;
  thickness: number;
  mirrorMat: unknown;
  baseMaterial: unknown;
  zSign: number;
  isSketch: boolean;
  mirrorLayout: MirrorLayoutList;
  addOutlines: (mesh: Object3DLike) => void;
  hasGrooves?: boolean;
  groovePartId?: string | null;
  grooveLinesCount?: number | null;
  grooveLayout?: GrooveLayoutList | null;
  tagDoorVisualPart: TagDoorVisualPartFn;
  mirrorReflectorProfile?: BuilderMirrorReflectorProfile | null;
};

function readPanelDepth(child: Object3DLike): number | null {
  const geometry = Reflect.get(child, 'geometry');
  return readGeometryRuntimePositiveBoxDimension(geometry, 2, 'depth');
}

function findStyledCenterPanel(
  visualGroup: Object3DLike,
  style: Exclude<MixedSurfaceStyle, 'flat'>
): CenterPanelTarget | null {
  const role = style === 'profile' ? 'door_profile_center_panel' : 'door_double_profile_center_panel';
  for (const child of visualGroup.children) {
    if (child.userData?.__doorVisualRole !== role) continue;
    const depth = readPanelDepth(child);
    if (!(typeof depth === 'number' && depth > 0)) continue;
    const rect = readMirrorPlacementRectMetadata(child);
    if (!rect) continue;
    return { parent: child, rect, baseHalfDepthM: depth / 2 };
  }
  return null;
}

function buildBaseDoor(args: MixedSurfaceDoorVisualArgs): {
  visualGroup: Object3DLike;
  target: CenterPanelTarget;
} {
  const visualGroup = new args.THREE.Group();
  const mat = args.baseMaterial || new args.THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const styleArgs = {
    App: args.App,
    THREE: args.THREE,
    visualGroup,
    addOutlines: args.addOutlines,
    tagDoorVisualPart: args.tagDoorVisualPart,
    w: args.w,
    h: args.h,
    thickness: args.thickness,
    mat,
    hasGrooves: args.hasGrooves === true,
    groovePartId: args.groovePartId ?? null,
    grooveLinesCount: args.grooveLinesCount ?? null,
    grooveLayout: args.grooveLayout ?? null,
    isSketch: args.isSketch,
    zSign: args.zSign,
  } as const;

  if (args.style === 'flat') {
    createFlatDoorVisual(styleArgs);
    return {
      visualGroup,
      target: {
        parent: visualGroup,
        rect: { minX: -args.w / 2, maxX: args.w / 2, minY: -args.h / 2, maxY: args.h / 2 },
        baseHalfDepthM: args.thickness / 2,
      },
    };
  }

  if (args.style === 'profile') createProfileDoorVisual(styleArgs);
  else createDoubleProfileDoorVisual(styleArgs);

  const target = findStyledCenterPanel(visualGroup, args.style);
  if (!target) {
    throw new Error('[WardrobePro] Mixed door surface overlay center panel was not created');
  }
  return { visualGroup, target };
}

function appendAdhesivePlacement(args: {
  base: MixedSurfaceDoorVisualArgs;
  target: CenterPanelTarget;
  layout: MirrorLayoutList[number];
  kind: 'black_glass' | 'frosted_glass';
}): void {
  appendAdhesiveGlassLayoutPlacement({
    App: args.base.App,
    THREE: args.base.THREE,
    group: args.target.parent,
    kind: args.kind,
    rect: args.target.rect,
    layout: args.layout,
    baseHalfDepthM: args.target.baseHalfDepthM,
    thickness: args.base.thickness,
    zSign: args.base.zSign,
    role: args.base.style === 'flat' ? 'door_adhesive_glass_surface' : 'door_adhesive_glass_center_panel',
    tagDoorVisualPart: args.base.tagDoorVisualPart,
  });
}

export function createMixedSurfaceDoorVisual(args: MixedSurfaceDoorVisualArgs): Object3DLike {
  const { visualGroup, target } = buildBaseDoor(args);

  for (let index = 0; index < args.mirrorLayout.length; index += 1) {
    const layout = args.mirrorLayout[index];
    if (!layout) continue;
    const kind = layout.surfaceKind;
    if (kind !== 'mirror' && kind !== 'black_glass' && kind !== 'frosted_glass') {
      throw new Error('[WardrobePro] Mixed door surface layout requires an explicit surface kind');
    }
    if (kind === 'mirror') {
      appendMirrorDoorSurfaceLayoutPlacement({
        App: args.App,
        THREE: args.THREE,
        parent: target.parent,
        mat: args.mirrorMat,
        rect: target.rect,
        layout,
        placementIndex: index,
        baseHalfDepthM: target.baseHalfDepthM,
        thickness: args.thickness,
        zSign: args.zSign,
        isSketch: args.isSketch,
        role: args.style === 'flat' ? 'door_mirror_surface' : 'door_mirror_center_panel',
        groovePartId: args.groovePartId ?? null,
        tagDoorVisualPart: args.tagDoorVisualPart,
        mirrorReflectorProfile: args.mirrorReflectorProfile ?? null,
      });
      continue;
    }
    appendAdhesivePlacement({ base: args, target, layout, kind });
  }

  return visualGroup;
}
