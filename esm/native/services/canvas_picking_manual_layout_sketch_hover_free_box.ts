import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  ResolveSketchFreeBoxHoverPlacementArgs,
  ResolveSketchFreeBoxHoverPlacementResult,
  SketchFreeBoxGeometryArgs,
  SketchFreeBoxGeometry,
  ResolveSketchBoxSegmentsArgs,
  SelectorLocalBox,
  LocalPoint,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import {
  resolveSketchFreePlacementBoxPreview,
  type SketchFreeHoverHost,
} from './canvas_picking_sketch_free_surface_preview.js';

type SketchPreviewArgs = UnknownRecord;
type ManualLayoutSketchHoverFreeBoxContext = {
  host: SketchFreeHoverHost;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  planeHit: LocalPoint;
  freeBoxes: UnknownRecord[];
  freeBoxSpec: UnknownRecord | null;
};

type ManualLayoutSketchHoverFreeBoxArgs = {
  App: AppContainer;
  tool: string;
  wardrobeGroup: unknown;
  context: ManualLayoutSketchHoverFreeBoxContext;
  setPreview: ((args: SketchPreviewArgs) => unknown) | null;
  __wp_resolveSketchFreeBoxHoverPlacement: (
    args: ResolveSketchFreeBoxHoverPlacementArgs
  ) => ResolveSketchFreeBoxHoverPlacementResult | null;
  __wp_resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  __wp_readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  __wp_resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  __wp_writeSketchHover: (App: AppContainer, snap: UnknownRecord) => void;
};

function readNumber(obj: unknown, key: string): number | null {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const value = Reflect.get(obj, key);
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) ? value : null;
}

export function tryHandleManualLayoutSketchHoverFreePlacementPreview(
  args: ManualLayoutSketchHoverFreeBoxArgs
): boolean {
  const {
    App,
    tool,
    wardrobeGroup,
    context,
    setPreview,
    __wp_resolveSketchFreeBoxHoverPlacement,
    __wp_resolveSketchFreeBoxGeometry,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_writeSketchHover,
  } = args;

  if (!setPreview || !context.freeBoxSpec) return false;

  const { host, wardrobeBox, wardrobeBackZ, planeHit, freeBoxes, freeBoxSpec } = context;
  const heightCm = readNumber(freeBoxSpec, 'heightCm');
  const widthCm = readNumber(freeBoxSpec, 'widthCm');
  const depthCm = readNumber(freeBoxSpec, 'depthCm');
  const boxH = Math.max(0.05, (heightCm ?? 0) / 100);
  const widthOverrideM = widthCm != null && widthCm > 0 ? widthCm / 100 : null;
  const depthOverrideM = depthCm != null && depthCm > 0 ? depthCm / 100 : null;
  const placementPreview = resolveSketchFreePlacementBoxPreview({
    App,
    tool,
    host,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    freeBoxes,
    intersects: [],
    localParent: wardrobeGroup,
    resolveSketchFreeBoxHoverPlacement: __wp_resolveSketchFreeBoxHoverPlacement,
    resolveSketchFreeBoxGeometry: __wp_resolveSketchFreeBoxGeometry,
    readSketchBoxDividers: __wp_readSketchBoxDividers,
    resolveSketchBoxSegments: __wp_resolveSketchBoxSegments,
    boxH,
    widthOverrideM,
    depthOverrideM,
  });
  if (!placementPreview) return false;

  __wp_writeSketchHover(App, placementPreview.hoverRecord);
  setPreview({
    App,
    THREE: getThreeMaybe(App),
    anchorParent: wardrobeGroup,
    ...placementPreview.preview,
  });
  return true;
}
