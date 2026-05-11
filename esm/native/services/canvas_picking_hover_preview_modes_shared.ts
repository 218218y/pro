import type { AppContainer, SketchPlacementPreviewArgsLike, UnknownRecord } from '../../../types';
import type {
  HitObjectLike,
  MouseVectorLike,
  RaycastHitLike,
  RaycasterLike,
} from './canvas_picking_engine.js';
import { asRecord } from '../runtime/record.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type SelectorLocalBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type InteriorHoverTarget = {
  intersects: RaycastHitLike[];
  hitModuleKey: ModuleKey;
  hitSelectorObj: HitObjectLike | null;
  isBottom: boolean;
  hitY: number;
  info: UnknownRecord;
  bottomY: number;
  topY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  backZ: number;
  regularDepth: number;
};

export type DrawerHoverPreviewTarget = {
  drawer: UnknownRecord;
  parent: UnknownRecord;
  box: SelectorLocalBox;
};

export type HidePreviewFn = ((args: UnknownRecord) => unknown) | null | undefined;
export type ReadUiFn = (App: AppContainer) => UnknownRecord;
export type InteriorHoverResolverFn = (
  App: AppContainer,
  raycaster: RaycasterLike,
  mouse: MouseVectorLike,
  ndcX: number,
  ndcY: number
) => InteriorHoverTarget | null;
export type MeasureObjectLocalBoxFn = (
  App: AppContainer,
  obj: unknown,
  parent?: unknown
) => SelectorLocalBox | null;
export type ReadInteriorModuleConfigRefFn = (
  App: AppContainer,
  hitModuleKey: ModuleKey,
  isBottom: boolean
) => UnknownRecord | null;
export type ResolveDrawerHoverPreviewTargetFn = (
  App: AppContainer,
  raycaster: RaycasterLike,
  mouse: MouseVectorLike,
  ndcX: number,
  ndcY: number
) => DrawerHoverPreviewTarget | null;
export type ReadCellDimsDraftFn = (App: AppContainer) => {
  applyW?: number | null;
  applyH?: number | null;
  applyD?: number | null;
};
export type EstimateVisibleModuleFrontZFn = (
  App: AppContainer,
  target: InteriorHoverTarget,
  selectorBox: SelectorLocalBox
) => number;
export type GetCellDimsHoverOpFn = (
  App: AppContainer,
  target: InteriorHoverTarget,
  selectorBox: SelectorLocalBox
) => 'add' | 'remove';

export type HoverPreviewModeBaseArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  hideLayoutPreview?: HidePreviewFn;
  hideSketchPreview?: HidePreviewFn;
};

export type ExtDrawersHoverPreviewArgs = HoverPreviewModeBaseArgs & {
  isExtDrawerEditMode: boolean;
  readUi: ReadUiFn;
  resolveInteriorHoverTarget: InteriorHoverResolverFn;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
  readInteriorModuleConfigRef: ReadInteriorModuleConfigRefFn;
  resolveDrawerHoverPreviewTarget?: ResolveDrawerHoverPreviewTargetFn;
};

export type DrawerDividerHoverPreviewArgs = HoverPreviewModeBaseArgs & {
  isDividerEditMode: boolean;
  resolveDrawerHoverPreviewTarget: ResolveDrawerHoverPreviewTargetFn;
};

export type CellDimsHoverPreviewArgs = HoverPreviewModeBaseArgs & {
  isCellDimsMode: boolean;
  previewRo?: UnknownRecord | null;
  resolveInteriorHoverTarget: InteriorHoverResolverFn;
  measureObjectLocalBox: MeasureObjectLocalBoxFn;
  readCellDimsDraft: ReadCellDimsDraftFn;
  estimateVisibleModuleFrontZ: EstimateVisibleModuleFrontZFn;
  getCellDimsHoverOp: GetCellDimsHoverOpFn;
};

export function __readRecord(value: unknown): UnknownRecord | null {
  return asRecord<UnknownRecord>(value);
}

export function __readString(rec: UnknownRecord | null, key: string, defaultValue = ''): string {
  const value = rec ? rec[key] : null;
  return typeof value === 'string' && value ? String(value) : defaultValue;
}

export function __readNumber(rec: UnknownRecord | null, key: string, defaultValue = 0): number {
  const value = rec ? rec[key] : null;
  return typeof value === 'number' && Number.isFinite(value) ? Number(value) : defaultValue;
}

export function __readArray(rec: UnknownRecord | null, key: string): UnknownRecord[] {
  const value = rec ? rec[key] : null;
  return Array.isArray(value)
    ? value.map(item => __readRecord(item)).filter((item): item is UnknownRecord => !!item)
    : [];
}

export function __withAppThree(App: AppContainer, THREE: unknown): UnknownRecord {
  return { App, THREE };
}

export function __callMaybe(fn: HidePreviewFn, args: UnknownRecord): void {
  if (typeof fn === 'function') fn(args);
}

export function __asNum(v: unknown, defaultValue = NaN): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultValue;
}

export function __hasOwnFiniteValue(rec: UnknownRecord | null, key: string): boolean {
  return !!(
    rec &&
    Object.prototype.hasOwnProperty.call(rec, key) &&
    Number.isFinite(Number(rec[key])) &&
    Number(rec[key]) > 0
  );
}

export function __getSketchPlacementPreviewFns(App: AppContainer): {
  hidePreview: HidePreviewFn;
  setPreview: ((args: UnknownRecord) => unknown) | null;
} {
  const ro = getBuilderRenderOps(App);
  const rec = __readRecord(ro);
  const hideCandidate = rec ? rec.hideSketchPlacementPreview : null;
  const setCandidate = rec ? rec.setSketchPlacementPreview : null;
  const hidePreviewFn: ((args: UnknownRecord) => unknown) | null =
    typeof hideCandidate === 'function' ? args => hideCandidate(args) : null;
  const setPreviewFn: ((args: SketchPlacementPreviewArgsLike) => unknown) | null =
    typeof setCandidate === 'function' ? args => setCandidate(args) : null;
  const hidePreview: HidePreviewFn = hidePreviewFn ? (args: UnknownRecord) => hidePreviewFn(args) : null;
  const setPreview: ((args: UnknownRecord) => unknown) | null = setPreviewFn
    ? (args: UnknownRecord) => setPreviewFn(args)
    : null;
  return { hidePreview, setPreview };
}

export function __readPreviewSetSketchPlacementPreview(
  previewRo: UnknownRecord | null | undefined
): ((args: UnknownRecord) => unknown) | null {
  const ro = __readRecord(previewRo);
  const candidate = ro ? ro.setSketchPlacementPreview : null;
  return typeof candidate === 'function' ? (args: UnknownRecord) => candidate(args) : null;
}
