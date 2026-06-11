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

type RecordMap = Record<string, unknown>;

function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

function readRecordList(record: unknown, key: string): RecordMap[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.filter((entry): entry is RecordMap => !!asRecord(entry)) : [];
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
    boxH: number;
    widthOverrideM?: number | null;
    depthOverrideM?: number | null;
    wardrobeBox: SelectorLocalBox;
    wardrobeBackZ: number;
    freeBoxes: unknown[];
  }) => {
    op: 'add' | 'move' | 'remove';
    previewX: number;
    previewY: number;
    previewH: number;
    previewW: number;
    previewD: number;
    removeId?: string | null;
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

  if (!(hoverRec && hoverRec.freePlacement === true)) {
    const { camera, wardrobeGroup } = __wp_getViewportRoots(App);
    const wardrobeBackZ =
      wardrobeBox && Number.isFinite(wardrobeBox.centerZ) && Number.isFinite(wardrobeBox.depth)
        ? Number(wardrobeBox.centerZ) - Number(wardrobeBox.depth) / 2
        : NaN;
    const heightCm = readFinitePositiveNumber(freeBoxSpec, 'heightCm');
    const widthCm = readFinitePositiveNumber(freeBoxSpec, 'widthCm');
    const depthCm = readFinitePositiveNumber(freeBoxSpec, 'depthCm');
    const boxH = Math.max(0.05, (heightCm ?? 0) / 100);
    const widthOverrideM = widthCm != null ? widthCm / 100 : null;
    const depthOverrideM = depthCm != null ? depthCm / 100 : null;

    if (camera && wardrobeGroup && wardrobeBox && Number.isFinite(wardrobeBackZ) && raycaster && mouse) {
      const planeHit = __wp_intersectScreenWithLocalZPlane({
        App,
        raycaster,
        mouse,
        camera,
        ndcX,
        ndcY,
        localParent: wardrobeGroup,
        planeZ: wardrobeBackZ,
      });
      if (planeHit) {
        const cfgRef = __wp_readInteriorModuleConfigRef(App, host.moduleKey, host.isBottom);
        const extra = asRecord(readRecordValue(cfgRef, 'sketchExtras'));
        const boxes = readRecordList(extra, 'boxes');
        const hoverPlacement = __wp_resolveSketchFreeBoxHoverPlacement({
          App,
          planeX: Number(planeHit.x),
          planeY: Number(planeHit.y),
          boxH,
          widthOverrideM,
          depthOverrideM,
          wardrobeBox,
          wardrobeBackZ,
          freeBoxes: boxes,
        });
        if (hoverPlacement) {
          hoverRec = createSketchFreePlacementBoxHoverRecord({
            tool,
            host,
            op: hoverPlacement.op === 'move' ? 'add' : hoverPlacement.op,
            previewX: hoverPlacement.previewX,
            previewY: hoverPlacement.previewY,
            previewH: hoverPlacement.previewH,
            previewW: hoverPlacement.previewW,
            previewD: hoverPlacement.previewD,
            removeId: hoverPlacement.op === 'remove' ? hoverPlacement.removeId : null,
          });
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
