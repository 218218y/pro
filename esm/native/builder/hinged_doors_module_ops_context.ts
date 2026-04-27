import { reportError, shouldFailFast } from '../runtime/api.js';
import type { AppendHingedDoorOpsParams, HingedDoorPipelineCfg } from './hinged_doors_shared.js';
import { readFiniteNumber, readRecord, readTextMap, readUnknownArray } from './hinged_doors_shared.js';
import type { HingedDoorModuleOpsContext, HingedDoorPivotSpec } from './hinged_doors_module_ops_contracts.js';

function resolveHingedDoorOpsList(value: AppendHingedDoorOpsParams['opsList'] | unknown) {
  return Array.isArray(value) ? value : null;
}

function readHingedDoorPivotSpec(value: unknown): HingedDoorPivotSpec | null {
  const rec = readRecord(value);
  if (!rec) return null;
  const out: HingedDoorPivotSpec = {};
  const pivotX = readFiniteNumber(rec.pivotX, NaN);
  const meshOffsetX = readFiniteNumber(rec.meshOffsetX, NaN);
  const doorWidth = readFiniteNumber(rec.doorWidth, NaN);
  if (Number.isFinite(pivotX)) out.pivotX = pivotX;
  if (Number.isFinite(meshOffsetX)) out.meshOffsetX = meshOffsetX;
  if (typeof rec.isLeftHinge === 'boolean') out.isLeftHinge = rec.isLeftHinge;
  if (Number.isFinite(doorWidth)) out.doorWidth = doorWidth;
  return out;
}

function readHingedDoorPivotMap(value: unknown): Record<number, HingedDoorPivotSpec> | null {
  const rec = readRecord(value);
  if (!rec) return null;
  const out: Record<number, HingedDoorPivotSpec> = {};
  for (const key of Object.keys(rec)) {
    const index = Number(key);
    if (!Number.isInteger(index)) continue;
    const spec = readHingedDoorPivotSpec(rec[key]);
    if (spec) out[index] = spec;
  }
  return out;
}

const isSpecialVal = (v: unknown) => v === 'mirror' || v === 'glass';

export function createHingedDoorModuleOpsContext(
  params: AppendHingedDoorOpsParams
): HingedDoorModuleOpsContext | null {
  const App = params && params.App;
  const THREE = params && params.THREE;
  const cfg: HingedDoorPipelineCfg = (params && params.cfg) || {};

  const index = params && typeof params.moduleIndex === 'number' ? params.moduleIndex : 0;
  const modulesLength = params && typeof params.modulesLength === 'number' ? params.modulesLength : 0;
  const moduleDoors = params && typeof params.moduleDoors === 'number' ? params.moduleDoors : 0;
  const modWidth = params && typeof params.modWidth === 'number' ? params.modWidth : 0;
  const currentX = params && typeof params.currentX === 'number' ? params.currentX : 0;
  const drawerHeightTotal =
    params && typeof params.drawerHeightTotal === 'number' ? params.drawerHeightTotal : 0;
  const effectiveBottomY =
    params && typeof params.effectiveBottomY === 'number' ? params.effectiveBottomY : 0;
  const startY = params && typeof params.startY === 'number' ? params.startY : 0;
  const woodThick = params && typeof params.woodThick === 'number' ? params.woodThick : 0;
  const cabinetBodyHeight =
    params && typeof params.cabinetBodyHeight === 'number' ? params.cabinetBodyHeight : 0;
  const D = params && typeof params.D === 'number' ? params.D : 0;
  const doorFrontZ =
    params && typeof params.moduleDoorFrontZ === 'number' && Number.isFinite(params.moduleDoorFrontZ)
      ? params.moduleDoorFrontZ
      : D / 2;
  const splitLineY = params && typeof params.splitLineY === 'number' ? params.splitLineY : 0;
  const splitDoors = !!(params && params.splitDoors);
  const stackKey = typeof params.__wpStack === 'string' ? String(params.__wpStack) : 'top';
  const isBottomStack = stackKey === 'bottom';
  const opsList = resolveHingedDoorOpsList(params && params.opsList);
  const hingedDoorPivotMap = readHingedDoorPivotMap(params && params.hingedDoorPivotMap);
  const globalHandleAbsY =
    params && typeof params.globalHandleAbsY === 'number' ? params.globalHandleAbsY : 1.05;
  const configRecord = readRecord((params && params.config) || {}) || {};
  const moduleCfgList = readUnknownArray(params && params.moduleCfgList);
  const isGroovesEnabled = !!(params && params.isGroovesEnabled);
  const removeDoorsEnabled = !!(params && params.removeDoorsEnabled);
  const shadowMat = params && params.shadowMat;
  const externalW = params && typeof params.externalW === 'number' ? params.externalW : 0;
  const externalCenterX = params && typeof params.externalCenterX === 'number' ? params.externalCenterX : 0;

  const getPartColorValue = params && params.getPartColorValue;
  const isDoorRemoved = params && params.isDoorRemoved;
  const getHingeDir = params && params.getHingeDir;
  const isDoorSplit = params && params.isDoorSplit;
  const isDoorSplitBottom = params && params.isDoorSplitBottom;
  const curtainVal = params && params.curtainVal;
  const grooveVal = params && params.grooveVal;

  const doorSpecialMap = readTextMap(cfg && cfg.doorSpecialMap) || {};
  const softWarnSeen = new Set<string>();

  const reportDoorSoftOnce = (op: string, error: unknown, extra?: Record<string, unknown>) => {
    const key = String(op || 'unknown');
    if (softWarnSeen.has(key)) return;
    softWarnSeen.add(key);
    reportError(App, error, {
      where: 'native/builder/hinged_doors_pipeline',
      op,
      fatal: false,
      ...(extra || {}),
    });
    if (shouldFailFast(App)) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  const isDoorSplitExplicitOn = (map: unknown, doorIdNum: number): boolean => {
    const m = readRecord(map);
    if (!m) return false;
    const base = `split_d${doorIdNum}`;
    const keys = [base, `${base}_full`, `${base}_top`, `${base}_bot`];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (Object.prototype.hasOwnProperty.call(m, k)) return m[k] !== false;
    }
    return false;
  };

  const getHingeDirSafe = (doorKey: string, defaultDir: 'left' | 'right'): 'left' | 'right' => {
    const resolved = typeof getHingeDir === 'function' ? getHingeDir(doorKey, defaultDir) : defaultDir;
    return resolved === 'right' ? 'right' : 'left';
  };
  const isDoorSplitSafe = (map: unknown, doorId: number): boolean =>
    typeof isDoorSplit === 'function' ? !!isDoorSplit(map, doorId) : false;
  const isDoorSplitBottomSafe = (map: unknown, doorId: number): boolean =>
    typeof isDoorSplitBottom === 'function' ? !!isDoorSplitBottom(map, doorId) : false;
  const getPartColorValueSafe = (partId: string): string | null => {
    const resolved = typeof getPartColorValue === 'function' ? getPartColorValue(partId) : null;
    return resolved == null ? null : String(resolved);
  };
  const grooveValSafe = (doorId: number, suffix: string, fallback: boolean): boolean =>
    typeof grooveVal === 'function' ? !!grooveVal(doorId, suffix, fallback) : fallback;
  const isDoorRemovedSafe = (partId: string): boolean =>
    typeof isDoorRemoved === 'function' ? !!isDoorRemoved(partId) : false;

  const resolveCurtainForPart = (partId: string, fallback: string | null | undefined): string | null => {
    try {
      const cm = readTextMap(cfg && cfg.curtainMap);
      if (cm && partId) {
        if (Object.prototype.hasOwnProperty.call(cm, partId)) return String(cm[partId]);
        if (partId.endsWith('_top') || partId.endsWith('_mid') || partId.endsWith('_bot')) {
          const full = partId.replace(/_(top|mid|bot)$/i, '_full');
          if (Object.prototype.hasOwnProperty.call(cm, full)) return String(cm[full]);
        }
      }
    } catch (e) {
      reportDoorSoftOnce('resolveCurtainForPart.mapLookup', e, { partId });
    }
    try {
      if (typeof curtainVal === 'function') {
        const m = /^d(\d+)_([a-z]+)$/i.exec(partId);
        if (m && m[1] && m[2]) {
          const n = parseInt(m[1], 10);
          const suf = String(m[2]);
          const v = curtainVal(n, suf, fallback);
          if (v != null) return String(v);
        }
        const v2 = curtainVal(partId, fallback);
        if (v2 != null) return String(v2);
      }
    } catch (e) {
      reportDoorSoftOnce('resolveCurtainForPart.injectedResolver', e, { partId });
    }
    return fallback == null ? null : String(fallback);
  };

  const resolveSpecialForPart = (
    partId: string,
    resolvedCurtainVal: string | null
  ): 'mirror' | 'glass' | null => {
    try {
      let v: unknown =
        partId && Object.prototype.hasOwnProperty.call(doorSpecialMap, partId)
          ? doorSpecialMap[partId]
          : null;
      if (!isSpecialVal(v) && typeof partId === 'string') {
        if (partId.endsWith('_top') || partId.endsWith('_mid') || partId.endsWith('_bot')) {
          const full = partId.replace(/_(top|mid|bot)$/i, '_full');
          if (Object.prototype.hasOwnProperty.call(doorSpecialMap, full)) v = doorSpecialMap[full];
        }
      }
      if (!isSpecialVal(v) && resolvedCurtainVal && resolvedCurtainVal !== 'none') v = 'glass';
      return v === 'mirror' || v === 'glass' ? v : null;
    } catch (e) {
      reportDoorSoftOnce('resolveSpecialForPart', e, { partId });
      return null;
    }
  };

  if (cfg.wardrobeType !== 'hinged') return null;

  const gapAboveDrawer = drawerHeightTotal > 0 ? 0.002 : 0;
  const drawerTopEdgeAbsolute = effectiveBottomY;
  const doorBottomY = drawerTopEdgeAbsolute + gapAboveDrawer;
  const effectiveTopLimit = startY + cabinetBodyHeight - woodThick / 2;
  const totalDoorSpace = effectiveTopLimit - doorBottomY;
  const singleDoorW = moduleDoors > 0 ? modWidth / moduleDoors : 0;

  return {
    App,
    THREE,
    cfg,
    index,
    modulesLength,
    moduleDoors,
    modWidth,
    currentX,
    drawerHeightTotal,
    effectiveBottomY,
    startY,
    woodThick,
    cabinetBodyHeight,
    D,
    doorFrontZ,
    splitLineY,
    splitDoors,
    stackKey,
    isBottomStack,
    opsList,
    hingedDoorPivotMap,
    globalHandleAbsY,
    configRecord,
    moduleCfgList,
    isGroovesEnabled,
    removeDoorsEnabled,
    shadowMat,
    externalW,
    externalCenterX,
    drawerTopEdgeAbsolute,
    doorBottomY,
    effectiveTopLimit,
    totalDoorSpace,
    singleDoorW,
    getHingeDirSafe,
    isDoorSplitSafe,
    isDoorSplitBottomSafe,
    getPartColorValueSafe,
    grooveValSafe,
    isDoorRemovedSafe,
    reportDoorSoftOnce,
    resolveCurtainForPart,
    resolveSpecialForPart,
    isDoorSplitExplicitOn,
  };
}
