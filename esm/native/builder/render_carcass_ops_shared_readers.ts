import { isCarcassCornicePlan, isCarcassCorniceSegment } from './carcass_cornice_ir.js';
import { isCarcassBackPanelOp, isCarcassBoardOp } from './carcass_shell_ir.js';

import type {
  AnyMap,
  AppContainer,
  BoardOp,
  CorniceOp,
  CorniceSegment,
  OutlineFn,
  PartMaterialFn,
  PlinthBaseOp,
  PlinthSegment,
  LegsBaseOp,
  LegPlatformsBaseOp,
  LegPlatformSegment,
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

function __isBaseOp(value: unknown): value is PlinthBaseOp | LegsBaseOp | LegPlatformsBaseOp {
  const rec = __asRecord(value);
  return !!(rec && (rec.kind === 'plinth' || rec.kind === 'legs' || rec.kind === 'leg_platforms'));
}

function __isCorniceOp(value: unknown): value is CorniceOp {
  return isCarcassCornicePlan(value);
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
        boards: Array.isArray(rec.boards) && rec.boards.every(isCarcassBoardOp) ? rec.boards : null,
        backPanels:
          rec.backPanels === null
            ? null
            : Array.isArray(rec.backPanels) && rec.backPanels.every(isCarcassBackPanelOp)
              ? rec.backPanels
              : null,
        backPanel: isCarcassBackPanelOp(rec.backPanel) ? rec.backPanel : null,
        cornice: __isCorniceOp(rec.cornice) ? rec.cornice : null,
      }
    : null;
}

export function __asFinite(v: unknown, defaultValue = NaN): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : defaultValue;
}

export function __asString(v: unknown, defaultValue = ''): string {
  return typeof v === 'string' ? v : defaultValue;
}

export function __asBool(v: unknown): boolean {
  return v === true;
}

export function __isFn(v: unknown): v is UnknownCallable {
  return typeof v === 'function';
}

function __isProfilePoint(value: unknown): value is ProfilePoint {
  const rec = __asRecord(value);
  return !!(
    rec &&
    typeof rec.x === 'number' &&
    Number.isFinite(rec.x) &&
    typeof rec.y === 'number' &&
    Number.isFinite(rec.y)
  );
}

export function __isPlinthSegment(value: unknown): value is PlinthSegment {
  return __isRecord(value);
}

export function __isLegPlatformSegment(value: unknown): value is LegPlatformSegment {
  return __isRecord(value);
}

export function __isBoardOp(value: unknown): value is BoardOp {
  return isCarcassBoardOp(value);
}

export function __isLegPosition(value: unknown): value is { x?: number; z?: number } | null | undefined {
  return value == null || __isRecord(value);
}

export function __isCorniceSegment(value: unknown): value is CorniceSegment {
  return isCarcassCorniceSegment(value);
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
