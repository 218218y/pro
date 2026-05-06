// Native Builder: hinged doors shared helpers (ESM)
//
// Own typed seams + reusable handle/THREE policies so the public hinged-doors
// pipeline stays orchestration-only while the per-module builder keeps the heavy
// op assembly logic.

import { assertThreeViaDeps } from '../runtime/three_access.js';
import { HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  BuildContextLike,
  BuilderCurtainResolver,
  BuilderDoorMapsConfigLike,
  BuilderDoorRemovedResolver,
  BuilderDoorSplitResolver,
  BuilderGrooveResolver,
  BuilderHingeDirResolver,
  BuilderPartColorResolver,
  HingedDoorOpLike,
  AppContainer,
  ThreeLike,
  UnknownRecord,
} from '../../../types';

const EDGE_HANDLE_VARIANT_GLOBAL_KEY = '__wp_edge_handle_variant_global';
const EDGE_HANDLE_VARIANT_PART_PREFIX = '__wp_edge_handle_variant:';

type ModuleDrawerCfg = {
  extDrawersCount?: unknown;
  extDrawers?: unknown;
};

export type HingedDoorPipelineCfg = BuilderDoorMapsConfigLike & {
  [key: string]: unknown;
};

type ModuleConfigRecord = {
  layout?: unknown;
  customData?: { storage?: unknown } | null;
  hasShoeDrawer?: unknown;
  extDrawers?: unknown;
  extDrawersCount?: unknown;
  [key: string]: unknown;
};

export type AppendHingedDoorOpsParams = {
  App?: AppContainer;
  THREE?: ThreeLike | null;
  cfg?: HingedDoorPipelineCfg | null;
  ui?: unknown;
  moduleIndex?: number;
  modulesLength?: number;
  moduleDoors?: number;
  modWidth?: number;
  currentX?: number;
  globalDoorCounter?: number;
  drawerHeightTotal?: number;
  effectiveBottomY?: number;
  startY?: number;
  woodThick?: number;
  cabinetBodyHeight?: number;
  cabinetTopY?: number;
  D?: number;
  moduleDoorFrontZ?: number;
  splitLineY?: number;
  splitDoors?: unknown;
  __wpStack?: string;
  opsList?: HingedDoorOpLike[] | null;
  hingedDoorPivotMap?: Record<
    number,
    { pivotX?: number; meshOffsetX?: number; isLeftHinge?: boolean; doorWidth?: number }
  > | null;
  globalHandleAbsY?: number;
  config?: unknown;
  moduleCfgList?: unknown;
  getPartColorValue?: BuilderPartColorResolver | null;
  isGroovesEnabled?: unknown;
  removeDoorsEnabled?: unknown;
  isDoorRemoved?: BuilderDoorRemovedResolver | null;
  shadowMat?: unknown;
  externalW?: number;
  externalCenterX?: number;
  getHingeDir?: BuilderHingeDirResolver | null;
  isDoorSplit?: BuilderDoorSplitResolver | null;
  isDoorSplitBottom?: BuilderDoorSplitResolver | null;
  curtainVal?: BuilderCurtainResolver | null;
  grooveVal?: BuilderGrooveResolver | null;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function readModuleDrawerCfg(value: unknown): ModuleDrawerCfg | null {
  return readRecord(value);
}

export function readModuleConfigRecord(value: unknown): ModuleConfigRecord | null {
  return readRecord(value);
}

export function readUnknownArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function readTextMap(value: unknown): UnknownRecord | null {
  return readRecord(value);
}

export function readFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function isThreeLike(value: unknown): value is ThreeLike {
  const rec = readRecord(value);
  return (
    !!rec &&
    typeof rec.Group === 'function' &&
    typeof rec.Mesh === 'function' &&
    typeof rec.Vector3 === 'function'
  );
}

export function readThreeLike(value: unknown): ThreeLike | null {
  return isThreeLike(value) ? value : null;
}

export function edgeHandleLongLiftAbsY(
  cfg: HingedDoorPipelineCfg | null | undefined,
  moduleCfgList: unknown
): number {
  if (!cfg || cfg.globalHandleType !== 'edge') return 0;

  const hm = readTextMap(cfg.handlesMap);
  let hasLongEdgeVariant = false;
  if (hm) {
    if (hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY] === 'long') {
      hasLongEdgeVariant = true;
    } else {
      for (const k of Object.keys(hm)) {
        if (k.startsWith(EDGE_HANDLE_VARIANT_PART_PREFIX) && hm[k] === 'long') {
          hasLongEdgeVariant = true;
          break;
        }
      }
    }
  }
  if (!hasLongEdgeVariant) return 0;

  const arr = readUnknownArray(moduleCfgList) || [];
  let maxExtDrawersCount = 0;
  arr.forEach(m => {
    const mm = readModuleDrawerCfg(m);
    if (!mm) return;
    const raw =
      typeof mm.extDrawersCount === 'number'
        ? mm.extDrawersCount
        : typeof mm.extDrawers === 'number'
          ? mm.extDrawers
          : 0;
    const count = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    if (count > maxExtDrawersCount) maxExtDrawersCount = count;
  });

  return maxExtDrawersCount >= HANDLE_DIMENSIONS.edge.longLiftDrawerCountThreshold
    ? HANDLE_DIMENSIONS.edge.longLiftExtraM
    : 0;
}

export function isLongEdgeHandleVariantForPart(
  cfg: HingedDoorPipelineCfg | null | undefined,
  partId: string | number | null | undefined
): boolean {
  if (!cfg || cfg.globalHandleType !== 'edge') return false;

  const hm = readTextMap(cfg.handlesMap);
  if (!hm) return false;

  const sid = partId == null ? '' : String(partId);
  const base = sid.replace(/_(full|top|mid|bot)$/i, '');

  const partKey = `${EDGE_HANDLE_VARIANT_PART_PREFIX}${sid}`;
  const baseKey = `${EDGE_HANDLE_VARIANT_PART_PREFIX}${base}`;

  const partV = hm[partKey] ?? (base !== sid ? hm[baseKey] : undefined);
  if (partV === 'long') return true;
  if (partV === 'short') return false;

  return hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY] === 'long';
}

export function topSplitHandleInsetForPart(
  cfg: HingedDoorPipelineCfg | null | undefined,
  partId: string
): number {
  return isLongEdgeHandleVariantForPart(cfg, partId)
    ? HANDLE_DIMENSIONS.edge.longClampPaddingM
    : HANDLE_DIMENSIONS.edge.shortClampPaddingM;
}

export function requireThree(ctx: BuildContextLike): ThreeLike {
  const explicit = ctx && ctx.THREE;
  const explicitThree = readThreeLike(explicit);
  if (explicitThree) return explicitThree;

  const App = ctx && ctx.App;
  if (!App) {
    throw new Error('[WardrobePro] Missing THREE in BuildContext/App deps');
  }
  const depsThree = readThreeLike(
    assertThreeViaDeps(App, 'native/builder/hinged_doors_pipeline.requireThree')
  );
  if (!depsThree) {
    throw new Error('[WardrobePro] Missing THREE surface in App deps');
  }
  return depsThree;
}
