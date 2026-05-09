import type {
  AnyMap,
  AppContainer,
  BackPanelSeg,
  BoardOp,
  CorniceOp,
  CorniceSegment,
  OutlineFn,
  PartMaterialFn,
  PlinthBaseOp,
  PlinthSegment,
  LegsBaseOp,
  ProfilePoint,
  RenderCarcassContext,
  UnknownCallable,
} from './render_carcass_ops_shared_contracts.js';

export function __isRecord(v: unknown): v is AnyMap {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function __asRecord(v: unknown): AnyMap | null {
  return __isRecord(v) ? v : null;
}

function __isAppContainer(value: unknown): value is AppContainer {
  return __isRecord(value);
}

function __readApp(v: unknown): AppContainer | undefined {
  return __isAppContainer(v) ? v : undefined;
}

function __isBaseOp(value: unknown): value is PlinthBaseOp | LegsBaseOp {
  const rec = __asRecord(value);
  return !!(rec && (rec.kind === 'plinth' || rec.kind === 'legs'));
}

function __isBackPanelSegRecord(value: unknown): value is BackPanelSeg {
  const rec = __asRecord(value);
  return !!(
    rec &&
    rec.kind === 'back_panel' &&
    typeof rec.width === 'number' &&
    typeof rec.height === 'number' &&
    typeof rec.depth === 'number' &&
    typeof rec.x === 'number' &&
    typeof rec.y === 'number' &&
    typeof rec.z === 'number'
  );
}

function __isCorniceOp(value: unknown): value is CorniceOp {
  const rec = __asRecord(value);
  return !!(rec && rec.kind === 'cornice');
}

export function __readUnknownArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v.slice() : null;
}

export function __readArray<T>(v: unknown, itemGuard: (value: unknown) => value is T): T[] | null {
  const values = __readUnknownArray(v);
  return values ? values.filter(itemGuard) : null;
}

export function __asContext(v: unknown): RenderCarcassContext {
  const rec = __asRecord(v);
  if (!rec) return {};
  return {
    App: __readApp(rec.App),
    THREE: rec.THREE,
    addOutlines: __isFn(rec.addOutlines) ? __outlineFn(rec.addOutlines) : undefined,
    getPartMaterial: __isFn(rec.getPartMaterial)
      ? __partMaterialFn(rec.getPartMaterial) || undefined
      : undefined,
    __sketchMode: rec.__sketchMode === true,
    plinthMat: rec.plinthMat,
    legMat: rec.legMat,
    bodyMat: rec.bodyMat,
    masoniteMat: rec.masoniteMat,
    whiteMat: rec.whiteMat,
    corniceMat: rec.corniceMat,
  };
}

export function __asOps(v: unknown) {
  const rec = __asRecord(v);
  return rec
    ? {
        base: __isBaseOp(rec.base) ? rec.base : null,
        boards: rec.boards,
        backPanels: rec.backPanels,
        backPanel: __isBackPanelSegRecord(rec.backPanel) ? rec.backPanel : null,
        cornice: __isCorniceOp(rec.cornice) ? rec.cornice : null,
      }
    : null;
}

export function __asFinite(v: unknown, defaultValue = NaN): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
}

export function __asString(v: unknown, defaultValue = ''): string {
  return typeof v === 'string' ? v : v == null ? defaultValue : String(v);
}

export function __asBool(v: unknown): boolean {
  return v === true;
}

export function __isFn(v: unknown): v is UnknownCallable {
  return typeof v === 'function';
}

function __isProfilePoint(value: unknown): value is ProfilePoint {
  return __isRecord(value);
}

export function __isPlinthSegment(value: unknown): value is PlinthSegment {
  return __isRecord(value);
}

export function __isBoardOp(value: unknown): value is BoardOp {
  const rec = __asRecord(value);
  return !!(rec && rec.kind === 'board');
}

export function __isLegPosition(value: unknown): value is { x?: number; z?: number } | null | undefined {
  return value == null || __isRecord(value);
}

export function __isCorniceSegment(value: unknown): value is CorniceSegment {
  return __isRecord(value);
}

export function __profilePoints(v: unknown): ProfilePoint[] | null {
  return __readArray(v, __isProfilePoint);
}

export function __partMaterialFn(v: unknown): PartMaterialFn | null {
  if (typeof v !== 'function') return null;
  return (partId: string) => Reflect.apply(v, undefined, [partId]);
}

export function __outlineFn(v: unknown): OutlineFn {
  if (typeof v !== 'function') return () => {};
  return (obj: unknown) => Reflect.apply(v, undefined, [obj]);
}
