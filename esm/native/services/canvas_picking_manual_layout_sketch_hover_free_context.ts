import type { AppContainer, UnknownRecord } from '../../../types';
import type {
  IntersectScreenWithLocalZPlaneArgs,
  LocalPoint,
  ModuleKey,
  SelectorLocalBox,
} from './canvas_picking_manual_layout_sketch_contracts.js';

import { asRecord } from '../runtime/record.js';
import type { SketchFreeHoverHost } from './canvas_picking_sketch_free_surface_preview.js';

type InteriorModuleConfigRefLike = UnknownRecord;

type ResolveManualLayoutSketchHoverFreePlaneContextArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  camera: unknown;
  wardrobeGroup: unknown;
  raycaster: unknown;
  mouse: unknown;
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
  const wardrobeBox = __wp_measureWardrobeLocalBox(App);
  const wardrobeBackZ =
    wardrobeBox && Number.isFinite(wardrobeBox.centerZ) && Number.isFinite(wardrobeBox.depth)
      ? Number(wardrobeBox.centerZ) - Number(wardrobeBox.depth) / 2
      : NaN;
  const planeHit =
    host &&
    wardrobeBox &&
    Number.isFinite(wardrobeBackZ) &&
    isIntersectPlaneRaycaster(raycaster) &&
    isIntersectPlaneMouse(mouse) &&
    __wp_intersectScreenWithLocalZPlane({
      App,
      raycaster,
      mouse,
      camera,
      ndcX,
      ndcY,
      localParent: wardrobeGroup,
      planeZ: wardrobeBackZ,
    });

  if (!(host && wardrobeBox && planeHit && Number.isFinite(wardrobeBackZ))) return null;

  const cfgRef = __wp_readInteriorModuleConfigRef(App, host.moduleKey, host.isBottom);
  const extra = asRecord(readRecordValue(cfgRef, 'sketchExtras'));
  const freeBoxes = readRecordArray(extra, 'boxes');

  return {
    host,
    wardrobeBox,
    wardrobeBackZ,
    planeHit,
    freeBoxes,
    freeBoxSpec: freeBoxSpec ?? null,
  };
}
