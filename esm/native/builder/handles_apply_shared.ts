import { DRAWER_HANDLE_PLACEMENT_POLICY } from '../../shared/dimensions/handle_policy.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { isEdgeHandleDefaultNone } from './edge_handle_default_none_runtime.js';
import {
  readManualHandlePositionForPart,
  type ManualHandlePosition,
} from '../features/manual_handle_position.js';
import { asRecord } from '../runtime/record.js';
import {
  appFromCtx,
  edgeHandleVariantPartKey,
  EDGE_HANDLE_VARIANT_GLOBAL_KEY,
  ensureHandlesSurface,
  normEdgeHandleVariant,
  requireHandlesRemoveDoorsEnabled,
  type EdgeHandleVariant,
  type HandlesApplyContext,
  type NodeLike,
  type ValueRecord,
} from './handles_shared.js';
import type { AppContainer, BuilderOutlineFn, ThreeLike } from '../../../types';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  HANDLE_COLOR_GLOBAL_KEY,
  handleColorPartKey,
  normalizeHandleFinishColor,
} from '../features/finish_palette/api.js';
import {
  captureHandlesConfigSnapshot,
  createHandlesDoorRemovedReader,
  isBottomSplitBotPartFromSnapshot,
  type HandlesConfigSnapshot,
} from './handles_config_snapshot.js';

export type HandlesApplyRuntime = {
  App: AppContainer;
  THREE: ThreeLike | null;
  cfgSnapshot: HandlesConfigSnapshot['cfg'];
  addOutlines: BuilderOutlineFn;
  removeDoorsEnabled: boolean;
  isDoorRemovedV7: (partId: unknown) => boolean;
  syncDoorVisibilityForRemovedDoors: () => void;
  getEdgeHandleVariant: (id: unknown) => EdgeHandleVariant;
  getHandleType: (id: unknown, stackKey?: 'top' | 'bottom') => string;
  getHandleColor: (id: unknown) => string;
  getManualHandlePosition: (id: unknown) => ManualHandlePosition | null;
  clampAbsYToGroup: (absY: number, centerY: number, height: number) => number;
  removeExistingHandleChildren: (group: NodeLike) => void;
};

function stripSuffix(sid: string): string {
  return sid.replace(/_(top|mid|bot|full)$/, '');
}

function readOverride(hm: ValueRecord | null | undefined, key: string): string | undefined {
  try {
    if (!hm || typeof hm !== 'object' || !key) return undefined;
    if (!Object.prototype.hasOwnProperty.call(hm, key)) return undefined;
    const v = hm[key];
    if (v === undefined || v === null || v === '') return undefined;
    return typeof v === 'string' ? v : undefined;
  } catch (_e) {
    return undefined;
  }
}

function createEdgeHandleVariantResolver(handlesMap: ValueRecord): (id: unknown) => EdgeHandleVariant {
  return (id: unknown): EdgeHandleVariant => {
    const sid = formatIdentityValue(readIdentityValue(id));
    const base = stripSuffix(sid);
    const hm = handlesMap;

    const partV =
      readOverride(hm, edgeHandleVariantPartKey(sid)) ??
      (stripSuffix(sid) !== sid ? readOverride(hm, edgeHandleVariantPartKey(base)) : undefined);

    if (partV === 'long') return 'long';
    if (partV === 'short') return 'short';

    const globalV = readOverride(hm, EDGE_HANDLE_VARIANT_GLOBAL_KEY);
    return normEdgeHandleVariant(globalV);
  };
}

function createHandleColorResolver(handlesMap: ValueRecord): (id: unknown) => string {
  return (id: unknown): string => {
    const sid = formatIdentityValue(readIdentityValue(id));
    const base = stripSuffix(sid);
    const hm = handlesMap;
    const partV = readOverride(hm, handleColorPartKey(sid));
    const baseV = sid !== base ? readOverride(hm, handleColorPartKey(base)) : undefined;
    const globalV = readOverride(hm, HANDLE_COLOR_GLOBAL_KEY);
    return normalizeHandleFinishColor(partV ?? baseV ?? globalV ?? DEFAULT_HANDLE_FINISH_COLOR);
  };
}

function createManualHandlePositionResolver(
  handlesMap: ValueRecord
): (id: unknown) => ManualHandlePosition | null {
  return (id: unknown): ManualHandlePosition | null => {
    const sid = formatIdentityValue(readIdentityValue(id));
    if (!sid) return null;
    const base = stripSuffix(sid);
    return readManualHandlePositionForPart(handlesMap, sid, base);
  };
}

function isInternalDrawerDefaultNoHandleId(id: string): boolean {
  return id.startsWith('div_int_') || id.includes('_int_drawers_');
}

function isShoeDrawerDefaultNoHandleId(id: string): boolean {
  return /(?:^|_)draw_shoe$/.test(id);
}

function createHandleTypeResolver(
  App: AppContainer,
  cfgSnapshot: HandlesConfigSnapshot,
  getEdgeHandleVariant: (id: unknown) => EdgeHandleVariant
): (id: unknown, stackKey?: 'top' | 'bottom') => string {
  void getEdgeHandleVariant;
  const cfg = cfgSnapshot.cfg;
  const hm = cfgSnapshot.handlesMap;
  const splitDoorsBottomMap = cfgSnapshot.splitDoorsBottomMap;
  const __rawGht = asRecord<ValueRecord>(cfg)?.globalHandleType;
  const globalHandleType =
    __rawGht === 'standard' || __rawGht === 'edge' || __rawGht === 'none' ? __rawGht : 'standard';

  return (id: unknown, stackKey?: 'top' | 'bottom'): string => {
    const sid = formatIdentityValue(readIdentityValue(id));
    const base = stripSuffix(sid);
    const sk: 'top' | 'bottom' = stackKey === 'bottom' ? 'bottom' : 'top';

    if (isBottomSplitBotPartFromSnapshot(splitDoorsBottomMap, sid)) {
      const ov = readOverride(hm, sid) ?? (stripSuffix(sid) !== sid ? readOverride(hm, base) : undefined);
      return ov !== undefined ? ov : 'none';
    }

    const override = readOverride(hm, sid) ?? (stripSuffix(sid) !== sid ? readOverride(hm, base) : undefined);
    if (override !== undefined) return override;

    if (
      isInternalDrawerDefaultNoHandleId(sid) ||
      isInternalDrawerDefaultNoHandleId(base) ||
      isShoeDrawerDefaultNoHandleId(sid) ||
      isShoeDrawerDefaultNoHandleId(base)
    )
      return 'none';

    if (globalHandleType === 'edge' && isEdgeHandleDefaultNone(App, sk, base)) return 'none';

    return globalHandleType || 'standard';
  };
}

function clampAbsYToGroup(absY: number, centerY: number, height: number): number {
  let y = absY;
  const H = height;
  const CY = centerY;
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(H) ||
    !Number.isFinite(CY) ||
    !(H > DRAWER_HANDLE_PLACEMENT_POLICY.absYClampMinHeightM)
  )
    return absY;
  const pad = Math.min(
    DRAWER_HANDLE_PLACEMENT_POLICY.absYClampPaddingMaxM,
    Math.max(
      DRAWER_HANDLE_PLACEMENT_POLICY.absYClampPaddingMinM,
      H * DRAWER_HANDLE_PLACEMENT_POLICY.absYClampPaddingHeightRatio
    )
  );
  const minY = CY - H / 2 + pad;
  const maxY = CY + H / 2 - pad;
  if (y < minY) y = minY;
  if (y > maxY) y = maxY;
  return y;
}

function removeExistingHandleChildren(group: NodeLike): void {
  for (let i = group.children.length - 1; i >= 0; i--) {
    const c = group.children[i];
    if (
      c.name === 'handle_group_v7' ||
      (c.userData && (c.userData.__kind === 'handle' || c.userData.isHandle))
    ) {
      group.remove(c);
    }
  }
}

function syncDoorVisibilityForRemovedDoors(
  App: AppContainer,
  removeDoorsEnabled: boolean,
  isDoorRemovedV7: (partId: unknown) => boolean
): void {
  const arr = getDoorsArray(App);
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    const g = d && d.group;
    if (!g) continue;

    if (g.userData && g.userData.__baseVisible === undefined) {
      g.userData.__baseVisible = !!g.visible;
    }
    const baseVis =
      g.userData && g.userData.__baseVisible !== undefined ? !!g.userData.__baseVisible : !!g.visible;

    if (!removeDoorsEnabled) {
      g.visible = baseVis;
      continue;
    }

    const pid =
      formatIdentityValue(readIdentityValue(g.userData?.partId)) ||
      formatIdentityValue(readIdentityValue(d.id));
    const removed = isDoorRemovedV7(pid);
    g.visible = baseVis && !removed;
  }
}

export function createHandlesApplyRuntime(ctx: HandlesApplyContext): HandlesApplyRuntime {
  const App = appFromCtx(ctx);
  ensureHandlesSurface(App);
  const THREE = getThreeMaybe(App);

  const ctxRecord = asRecord<ValueRecord>(ctx);
  const handlesCfg = captureHandlesConfigSnapshot(ctxRecord?.cfgSnapshot);
  const addOutlines = ctxRecord?.addOutlines;
  if (typeof addOutlines !== 'function') {
    throw new TypeError('[handles_apply] snapshot outline binding is required');
  }
  const removeDoorsEnabled = requireHandlesRemoveDoorsEnabled(ctxRecord?.removeDoorsEnabled);

  const isDoorRemovedV7 = createHandlesDoorRemovedReader(handlesCfg.removedDoorsMap);
  const getEdgeHandleVariant = createEdgeHandleVariantResolver(handlesCfg.handlesMap);
  const getHandleType = createHandleTypeResolver(App, handlesCfg, getEdgeHandleVariant);
  const getHandleColor = createHandleColorResolver(handlesCfg.handlesMap);
  const getManualHandlePosition = createManualHandlePositionResolver(handlesCfg.handlesMap);
  const syncDoorVisibility = (): void =>
    syncDoorVisibilityForRemovedDoors(App, removeDoorsEnabled, isDoorRemovedV7);

  return {
    App,
    THREE,
    cfgSnapshot: handlesCfg.cfg,
    addOutlines: addOutlines as BuilderOutlineFn,
    removeDoorsEnabled,
    isDoorRemovedV7,
    syncDoorVisibilityForRemovedDoors: syncDoorVisibility,
    getEdgeHandleVariant,
    getHandleType,
    getHandleColor,
    getManualHandlePosition,
    clampAbsYToGroup,
    removeExistingHandleChildren,
  };
}
