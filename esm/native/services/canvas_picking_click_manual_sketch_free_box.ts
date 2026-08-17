import type { AppContainer, UnknownRecord } from '../../../types';
import type { SketchFreeHoverHost as SketchFreeBoxHost } from './canvas_picking_sketch_free_surface_preview.js';
import type { SelectorLocalBox } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import {
  commitSketchFreePlacementHoverRecord,
  createSketchFreePlacementBoxHoverRecord,
} from './canvas_picking_sketch_free_commit.js';
import { asRecord } from '../runtime/record.js';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import { cmToM } from '../../shared/dimensions/units.js';
import { findRoomWallSurfaceHit } from './room_wall_picking.js';

type RecordMap = Record<string, unknown>;

function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

function readRecordList(record: unknown, key: string): RecordMap[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.filter((entry): entry is RecordMap => !!asRecord(entry)) : [];
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readFinitePositiveNumber(spec: unknown, key: string): number | null {
  const rec = asRecord(spec);
  const value = rec ? rec[key] : null;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

type TryHandleCanvasManualSketchFreeBoxArgs = {
  App: AppContainer;
  tool: string;
  ndcX: number;
  ndcY: number;
  foundModuleIndex: number | 'corner' | `corner:${number}` | null;
  host: SketchFreeBoxHost | null;
  wardrobeBox: SelectorLocalBox | null;
  raycaster: RaycasterLike | null | undefined;
  mouse: MouseVectorLike | null | undefined;
  floorY: number;
  __wp_readSketchHover: (App: AppContainer) => unknown;
  __wp_writeSketchHover: (App: AppContainer, hover: UnknownRecord | null) => void;
  __wp_clearSketchHover: (App: AppContainer) => void;
  __wp_parseSketchBoxToolSpec: (tool: string) => unknown;
  __wp_getViewportRoots: (App: AppContainer) => { camera: unknown; wardrobeGroup: unknown };
  __wp_intersectScreenWithLocalZPlane: (args: {
    App: AppContainer;
    raycaster: RaycasterLike;
    mouse: MouseVectorLike;
    camera: unknown;
    ndcX: number;
    ndcY: number;
    localParent: unknown;
    planeZ: number;
  }) => { x: number; y: number; z: number } | null;
  __wp_readInteriorModuleConfigRef: (
    App: AppContainer,
    moduleKey: number | 'corner' | `corner:${number}`,
    isBottom: boolean
  ) => unknown;
  __wp_resolveSketchFreeBoxHoverPlacement: (args: {
    App: AppContainer;
    planeX: number;
    planeY: number;
    placementWall?: 'back' | 'left' | 'right';
    boxH: number;
    widthOverrideM?: number | null;
    depthOverrideM?: number | null;
    wardrobeBox: SelectorLocalBox;
    wardrobeBackZ: number;
    freeBoxes: unknown[];
  }) => {
    op: 'add' | 'remove';
    previewX: number;
    previewY: number;
    previewH: number;
    previewW: number;
    previewD: number;
    removeId?: string | null;
    placementWall: 'back' | 'left' | 'right';
    snapToCenter: boolean;
  } | null;
};

export function tryHandleCanvasManualSketchFreeBoxClick(
  args: TryHandleCanvasManualSketchFreeBoxArgs
): boolean {
  const {
    App,
    tool,
    ndcX,
    ndcY,
    foundModuleIndex,
    host,
    wardrobeBox,
    raycaster,
    mouse,
    floorY,
    __wp_readSketchHover,
    __wp_writeSketchHover,
    __wp_clearSketchHover,
    __wp_parseSketchBoxToolSpec,
    __wp_getViewportRoots,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
    __wp_resolveSketchFreeBoxHoverPlacement,
  } = args;

  const freeBoxSpec = __wp_parseSketchBoxToolSpec(tool);
  if (!(freeBoxSpec && host)) return false;

  let hoverRec = matchRecentSketchHover({
    hover: __wp_readSketchHover(App),
    tool,
    kind: 'box',
    host,
    toModuleKey: __wp_toModuleKey,
    requireFreePlacement: true,
  });

  const hasRecentFreePlacementHover = !!(hoverRec && hoverRec.freePlacement === true);
  if (!hasRecentFreePlacementHover && foundModuleIndex !== null) return false;

  if (!hasRecentFreePlacementHover) {
    const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
    const wardrobeCenterZ = readFiniteNumber(wardrobeBox?.centerZ);
    const wardrobeDepth = readFinitePositiveNumber(wardrobeBox, 'depth');
    const wardrobeBackZ =
      wardrobeCenterZ != null && wardrobeDepth != null ? wardrobeCenterZ - wardrobeDepth / 2 : NaN;
    const heightCm = readFinitePositiveNumber(freeBoxSpec, 'heightCm');
    const widthCm = readFinitePositiveNumber(freeBoxSpec, 'widthCm');
    const depthCm = readFinitePositiveNumber(freeBoxSpec, 'depthCm');
    const boxH = Math.max(SKETCH_BOX_SHELL_GEOMETRY_POLICY.minOuterHeightM, cmToM(heightCm ?? 0));
    const widthOverrideM = widthCm != null ? cmToM(widthCm) : null;
    const depthOverrideM = depthCm != null ? cmToM(depthCm) : null;

    if (camera && wardrobeGroup && wardrobeBox && raycaster && mouse) {
      const wallHit = findRoomWallSurfaceHit({ App, ndcX, ndcY, camera, raycaster, mouse });
      const placementWall =
        wallHit?.surface.wall === 'left' || wallHit?.surface.wall === 'right' ? wallHit.surface.wall : 'back';
      const placementWardrobeBox: SelectorLocalBox =
        placementWall === 'back'
          ? wardrobeBox
          : {
              centerX: Number(wallHit?.surface.startCoord) + Number(wallHit?.surface.usableLength) / 2,
              centerY: Number(wallHit?.surface.wallHeight) / 2,
              centerZ: 0,
              width: Number(wallHit?.surface.usableLength),
              height: Number(wallHit?.surface.wallHeight),
              depth: Number(wardrobeBox.depth) || 0,
            };
      const placementBackZ = placementWall === 'back' ? wardrobeBackZ : 0;
      const planeHit =
        placementWall === 'back' && Number.isFinite(wardrobeBackZ)
          ? __wp_intersectScreenWithLocalZPlane({
              App,
              raycaster,
              mouse,
              camera,
              ndcX,
              ndcY,
              localParent: wardrobeGroup,
              planeZ: wardrobeBackZ,
            })
          : wallHit
            ? { x: Number(wallHit.point.z), y: Number(wallHit.point.y), z: 0 }
            : null;
      if (planeHit) {
        const planeX = readFiniteNumber(planeHit.x);
        const planeY = readFiniteNumber(planeHit.y);
        if (planeX == null || planeY == null) return false;
        const cfgRef = __wp_readInteriorModuleConfigRef(App, host.moduleKey, host.isBottom);
        const extra = asRecord(readRecordValue(cfgRef, 'sketchExtras'));
        const boxes = readRecordList(extra, 'boxes').filter(box => {
          const wall = readRecordValue(box, 'placementWall');
          const normalized = wall === 'left' || wall === 'right' ? wall : 'back';
          return normalized === placementWall;
        });
        const hoverPlacement = __wp_resolveSketchFreeBoxHoverPlacement({
          App,
          planeX,
          planeY,
          placementWall,
          boxH,
          widthOverrideM,
          depthOverrideM,
          wardrobeBox: placementWardrobeBox,
          wardrobeBackZ: placementBackZ,
          freeBoxes: boxes,
        });
        if (hoverPlacement) {
          const nextHover = createSketchFreePlacementBoxHoverRecord({
            tool,
            host,
            op: hoverPlacement.op,
            previewX: hoverPlacement.previewX,
            previewY: hoverPlacement.previewY,
            previewH: hoverPlacement.previewH,
            previewW: hoverPlacement.previewW,
            previewD: hoverPlacement.previewD,
            placementWall: hoverPlacement.placementWall,
            removeId: hoverPlacement.op === 'remove' ? hoverPlacement.removeId : null,
          });
          if (nextHover) hoverRec = nextHover;
        }
      }
    }
  }

  if (!(hoverRec && hoverRec.freePlacement === true)) return false;

  const commit = commitSketchFreePlacementHoverRecord({ App, host, hoverRec, floorY });
  if (!commit.committed) return false;
  if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
  else __wp_clearSketchHover(App);
  return true;
}
