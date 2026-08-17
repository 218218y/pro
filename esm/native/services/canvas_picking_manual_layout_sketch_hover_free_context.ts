import type { AppContainer, RoomWallId, UnknownRecord } from '../../../types';
import type {
  IntersectScreenWithLocalZPlaneArgs,
  LocalPoint,
  ModuleKey,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';

import { asRecord } from '../runtime/record.js';
import type { SketchFreeHoverHost } from './canvas_picking_sketch_free_surface_preview.js';
import {
  readSketchFreePlacementTransform,
  remapSketchFreePlacementLocalPoint,
  type SketchFreePlacementTransform,
} from './canvas_picking_sketch_free_box_hit.js';
import {
  findRoomWallSurfaceHit,
  findRoomWallSurfaceMetaInScene,
  type RoomWallSurfacePickMeta,
} from './room_wall_picking.js';
import { __wp_projectWorldPointToLocal } from './canvas_picking_projection_runtime_plane.js';

type InteriorModuleConfigRefLike = UnknownRecord;

type ResolveManualLayoutSketchHoverFreePlaneContextArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  camera: unknown;
  wardrobeGroup: unknown;
  raycaster: unknown;
  mouse: unknown;
  intersects?: RaycastHitLike[];
  __wp_parseSketchBoxToolSpec: (tool: string) => UnknownRecord | null;
  __wp_pickSketchFreeBoxHost: (App: AppContainer) => SketchFreeHoverHost | null;
  __wp_measureWardrobeLocalBox: (App: AppContainer) => SelectorLocalBox | null;
  __wp_intersectScreenWithLocalZPlane: (args: IntersectScreenWithLocalZPlaneArgs) => LocalPoint | null;
  __wp_readInteriorModuleConfigRef: (
    App: AppContainer,
    moduleKey: ModuleKey,
    isBottom: boolean
  ) => InteriorModuleConfigRefLike | null;
  tool: string;
  requireBoxSpec?: boolean;
};

export type ManualLayoutSketchHoverFreePlaneContext = {
  host: SketchFreeHoverHost;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  planeHit: LocalPoint;
  freeBoxes: UnknownRecord[];
  freeBoxSpec: UnknownRecord | null;
  placementWall: RoomWallId;
  placementSurface: RoomWallSurfacePickMeta | null;
  placementTransform: SketchFreePlacementTransform | null;
};

function readRecordValue(obj: unknown, key: string): unknown {
  const rec = asRecord(obj);
  return rec ? rec[key] : undefined;
}

function readRecordArray(obj: unknown, key: string): UnknownRecord[] {
  const value = readRecordValue(obj, key);
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is UnknownRecord => !!asRecord(entry));
}

function isIntersectPlaneMouse(value: unknown): value is IntersectScreenWithLocalZPlaneArgs['mouse'] {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof Reflect.get(value, 'x') === 'number' &&
    typeof Reflect.get(value, 'y') === 'number'
  );
}

function isIntersectPlaneRaycaster(value: unknown): value is IntersectScreenWithLocalZPlaneArgs['raycaster'] {
  return !!value && typeof value === 'object' && typeof Reflect.get(value, 'setFromCamera') === 'function';
}

function normalizePlacementWall(value: unknown): RoomWallId {
  return value === 'left' || value === 'right' ? value : 'back';
}

function filterFreeBoxesForWall(boxes: UnknownRecord[], wall: RoomWallId): UnknownRecord[] {
  return boxes.filter(box => normalizePlacementWall(readRecordValue(box, 'placementWall')) === wall);
}

function isSketchFreePlacementRayObject(object: unknown): boolean {
  let node = object && typeof object === 'object' ? object : null;
  for (let depth = 0; node && depth < 12; depth += 1) {
    const userData = asRecord(Reflect.get(node, 'userData'));
    const partId = typeof userData?.partId === 'string' ? userData.partId : '';
    if (partId === 'sketch_box_free' || partId.startsWith('sketch_box_free_')) return true;
    node = Reflect.get(node, 'parent');
    if (!(node && typeof node === 'object')) node = null;
  }
  return false;
}

function findDirectFreePlacementHit(args: {
  App: AppContainer;
  wardrobeGroup: unknown;
  intersects: RaycastHitLike[];
}): {
  wall: RoomWallId;
  planeHit: LocalPoint | null;
  transform: SketchFreePlacementTransform | null;
} | null {
  for (const hit of args.intersects) {
    if (!isSketchFreePlacementRayObject(hit?.object)) continue;
    const transform = readSketchFreePlacementTransform(hit?.object);
    if (!(transform?.wall === 'left' || transform?.wall === 'right')) {
      return { wall: 'back', planeHit: null, transform: null };
    }
    if (!hit?.point) return { wall: transform.wall, planeHit: null, transform };
    const local = __wp_projectWorldPointToLocal(args.App, hit.point, args.wardrobeGroup);
    if (!local) return { wall: transform.wall, planeHit: null, transform };
    return {
      wall: transform.wall,
      planeHit: remapSketchFreePlacementLocalPoint(local, transform),
      transform,
    };
  }
  return null;
}

function isWallRaycaster(value: unknown): value is RaycasterLike {
  return isIntersectPlaneRaycaster(value);
}

function isWallMouse(value: unknown): value is MouseVectorLike {
  return isIntersectPlaneMouse(value);
}

function buildSideWallWorkspace(
  original: SelectorLocalBox,
  surface: RoomWallSurfacePickMeta
): SelectorLocalBox {
  return {
    centerX: surface.startCoord + surface.usableLength / 2,
    centerY: surface.wallHeight / 2,
    centerZ: 0,
    width: surface.usableLength,
    height: surface.wallHeight,
    depth: Number(original.depth) || 0,
  };
}

export function resolveManualLayoutSketchHoverFreePlaneContext(
  args: ResolveManualLayoutSketchHoverFreePlaneContextArgs
): ManualLayoutSketchHoverFreePlaneContext | null {
  const {
    App,
    tool,
    ndcX,
    ndcY,
    camera,
    wardrobeGroup,
    raycaster,
    mouse,
    intersects = [],
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
    requireBoxSpec = false,
  } = args;

  const freeBoxSpec = __wp_parseSketchBoxToolSpec(tool);
  if (requireBoxSpec && !freeBoxSpec) return null;

  const host = __wp_pickSketchFreeBoxHost(App);
  const measuredWardrobeBox = __wp_measureWardrobeLocalBox(App);
  if (!(host && measuredWardrobeBox)) return null;

  // `intersects` is ordered from the camera outward. Resolve the first free box
  // hit regardless of which wall owns it. Previously this scan skipped back-wall
  // boxes and kept walking until it found any side-wall transform farther along
  // the ray, so a side box behind the cursor could steal hover from the box that
  // was actually under the pointer.
  const directFreePlacementHit = findDirectFreePlacementHit({ App, wardrobeGroup, intersects });
  const taggedSideHit =
    directFreePlacementHit?.wall === 'left' || directFreePlacementHit?.wall === 'right'
      ? directFreePlacementHit
      : null;
  const directWallHit =
    !directFreePlacementHit && isWallRaycaster(raycaster) && isWallMouse(mouse)
      ? findRoomWallSurfaceHit({ App, ndcX, ndcY, camera, raycaster, mouse })
      : null;
  const directSideHit =
    directWallHit?.surface.wall === 'left' || directWallHit?.surface.wall === 'right' ? directWallHit : null;
  const placementWall: RoomWallId = directFreePlacementHit?.wall || directSideHit?.surface.wall || 'back';
  const placementSurface =
    placementWall === 'back'
      ? null
      : taggedSideHit
        ? findRoomWallSurfaceMetaInScene(App, placementWall)
        : directSideHit?.surface || null;

  const wardrobeBackZ =
    placementWall === 'back' &&
    Number.isFinite(measuredWardrobeBox.centerZ) &&
    Number.isFinite(measuredWardrobeBox.depth)
      ? Number(measuredWardrobeBox.centerZ) - Number(measuredWardrobeBox.depth) / 2
      : NaN;
  let wardrobeBox = measuredWardrobeBox;
  let planeHit: LocalPoint | null = null;
  let workspaceBackZ = wardrobeBackZ;

  if (placementSurface && (taggedSideHit?.planeHit || directSideHit)) {
    wardrobeBox = buildSideWallWorkspace(measuredWardrobeBox, placementSurface);
    workspaceBackZ = 0;
    planeHit = taggedSideHit?.planeHit || {
      x: Number(directSideHit?.point.z),
      y: Number(directSideHit?.point.y),
      z: 0,
    };
  } else if (
    Number.isFinite(wardrobeBackZ) &&
    isIntersectPlaneRaycaster(raycaster) &&
    isIntersectPlaneMouse(mouse)
  ) {
    planeHit = __wp_intersectScreenWithLocalZPlane({
      App,
      raycaster,
      mouse,
      camera,
      ndcX,
      ndcY,
      localParent: wardrobeGroup,
      planeZ: wardrobeBackZ,
    });
  }

  if (!(planeHit && Number.isFinite(workspaceBackZ))) return null;

  const cfgRef = __wp_readInteriorModuleConfigRef(App, host.moduleKey, host.isBottom);
  const extra = asRecord(readRecordValue(cfgRef, 'sketchExtras'));
  const freeBoxes = filterFreeBoxesForWall(readRecordArray(extra, 'boxes'), placementWall);

  return {
    host,
    wardrobeBox,
    wardrobeBackZ: workspaceBackZ,
    planeHit,
    freeBoxes,
    freeBoxSpec: freeBoxSpec ?? null,
    placementWall,
    placementSurface,
    placementTransform: taggedSideHit?.transform || null,
  };
}
