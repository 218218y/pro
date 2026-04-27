import { getModeId } from '../runtime/api.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getDoorsArray } from '../runtime/render_access.js';
import { readMapOrEmpty, isSplitBottomEnabledInMap } from '../runtime/maps_access.js';
import { getBuildStateMaybe, getCfg, getMode, getState, getUi } from './store_access.js';
import { isEdgeHandleDefaultNone } from './edge_handle_default_none_runtime.js';
import { asRecord } from '../runtime/record.js';
import {
  appFromCtx,
  edgeHandleVariantPartKey,
  EDGE_HANDLE_VARIANT_GLOBAL_KEY,
  ensureHandlesSurface,
  getViewFlags,
  normEdgeHandleVariant,
  type EdgeHandleVariant,
  type NodeLike,
  type ValueRecord,
} from './handles_shared.js';
import type { AppContainer, ThreeLike } from '../../../types';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  HANDLE_COLOR_GLOBAL_KEY,
  handleColorPartKey,
  normalizeHandleFinishColor,
} from '../features/handle_finish_shared.js';

export type HandlesApplyRuntime = {
  App: AppContainer;
  THREE: ThreeLike | null;
  removeDoorsEnabled: boolean;
  isDoorRemovedV7: (partId: unknown) => boolean;
  syncDoorVisibilityForRemovedDoors: () => void;
  getEdgeHandleVariant: (id: unknown) => EdgeHandleVariant;
  getHandleType: (id: unknown, stackKey?: 'top' | 'bottom') => string;
  getHandleColor: (id: unknown) => string;
  clampAbsYToGroup: (absY: number, centerY: number, height: number) => number;
  removeExistingHandleChildren: (group: NodeLike) => void;
};

function createDoorRemovedReader(App: AppContainer): (partId: unknown) => boolean {
  return (partId: unknown): boolean => {
    const raw = String(partId || '');
    const removedMap = readMapOrEmpty(App, 'removedDoorsMap');
    const m = asRecord<ValueRecord>(removedMap);
    if (!m || !raw) return false;

    const canon = (id0: string): string => {
      let id = String(id0 || '');
      if (!id) return '';
      if (!/(?:_(?:full|top|bot|mid))$/i.test(id)) {
        if (
          /^(?:lower_)?d\d+$/.test(id) ||
          /^(?:lower_)?corner_door_\d+$/.test(id) ||
          /^(?:lower_)?corner_pent_door_\d+$/.test(id)
        ) {
          id = id + '_full';
        }
      }
      return id;
    };

    const isRemoved = (id0: string): boolean => {
      const id = canon(id0);
      if (!id) return false;
      if (!!m[`removed_${id}`]) return true;
      if (id.endsWith('_top') || id.endsWith('_mid') || id.endsWith('_bot')) {
        const full = id.replace(/_(top|mid|bot)$/i, '_full');
        return !!m[`removed_${full}`];
      }
      return false;
    };

    return isRemoved(raw);
  };
}

function isBottomSplitBotPart(App: AppContainer, id: unknown): boolean {
  try {
    const sid = id == null ? '' : String(id);
    if (!sid || !sid.endsWith('_bot')) return false;
    const baseId = sid.replace(/_bot$/, '');
    if (!baseId) return false;
    const bm = readMapOrEmpty(App, 'splitDoorsBottomMap');
    return isSplitBottomEnabledInMap(bm, baseId);
  } catch (_) {
    return false;
  }
}

function stripSuffix(sid: string): string {
  return sid.replace(/_(top|mid|bot|full)$/, '');
}

function readOverride(hm: ValueRecord | null | undefined, key: string): string | undefined {
  try {
    if (!hm || typeof hm !== 'object' || !key) return undefined;
    if (!Object.prototype.hasOwnProperty.call(hm, key)) return undefined;
    const v = hm[key];
    if (v === undefined || v === null || v === '') return undefined;
    return String(v);
  } catch (_e) {
    return undefined;
  }
}

function createEdgeHandleVariantResolver(App: AppContainer): (id: unknown) => EdgeHandleVariant {
  return (id: unknown): EdgeHandleVariant => {
    const sid = id == null ? '' : String(id);
    const base = stripSuffix(sid);
    const hm = readMapOrEmpty(App, 'handlesMap');

    const partV =
      readOverride(hm, edgeHandleVariantPartKey(sid)) ??
      (stripSuffix(sid) !== sid ? readOverride(hm, edgeHandleVariantPartKey(base)) : undefined);

    if (partV === 'long') return 'long';
    if (partV === 'short') return 'short';

    const globalV = readOverride(hm, EDGE_HANDLE_VARIANT_GLOBAL_KEY);
    return normEdgeHandleVariant(globalV);
  };
}

function createHandleColorResolver(App: AppContainer): (id: unknown) => string {
  return (id: unknown): string => {
    const sid = id == null ? '' : String(id);
    const base = stripSuffix(sid);
    const hm = readMapOrEmpty(App, 'handlesMap');
    const partV = readOverride(hm, handleColorPartKey(sid));
    const baseV = sid !== base ? readOverride(hm, handleColorPartKey(base)) : undefined;
    const globalV = readOverride(hm, HANDLE_COLOR_GLOBAL_KEY);
    return normalizeHandleFinishColor(partV ?? baseV ?? globalV ?? DEFAULT_HANDLE_FINISH_COLOR);
  };
}

function createHandleTypeResolver(
  App: AppContainer,
  getEdgeHandleVariant: (id: unknown) => EdgeHandleVariant
): (id: unknown, stackKey?: 'top' | 'bottom') => string {
  void getEdgeHandleVariant;
  return (id: unknown, stackKey?: 'top' | 'bottom'): string => {
    const sid = id == null ? '' : String(id);
    const base = stripSuffix(sid);
    const sk: 'top' | 'bottom' = stackKey === 'bottom' ? 'bottom' : 'top';

    const cfg = getCfg(App);
    const hm = readMapOrEmpty(App, 'handlesMap');

    const __rawGht = asRecord<ValueRecord>(cfg)?.globalHandleType;
    const globalHandleType =
      __rawGht === 'standard' || __rawGht === 'edge' || __rawGht === 'none' ? __rawGht : 'standard';

    if (isBottomSplitBotPart(App, sid)) {
      const ov = readOverride(hm, sid) ?? (stripSuffix(sid) !== sid ? readOverride(hm, base) : undefined);
      return ov !== undefined ? ov : 'none';
    }

    const override = readOverride(hm, sid) ?? (stripSuffix(sid) !== sid ? readOverride(hm, base) : undefined);
    if (override !== undefined) return override;

    const __isInternalDrawerId = base.startsWith('div_int_') || sid.startsWith('div_int_');
    if (__isInternalDrawerId) return 'none';

    if (globalHandleType === 'edge' && isEdgeHandleDefaultNone(App, sk, base)) return 'none';

    return globalHandleType || 'standard';
  };
}

function clampAbsYToGroup(absY: number, centerY: number, height: number): number {
  let y = absY;
  const H = Number(height);
  const CY = Number(centerY);
  if (!Number.isFinite(y) || !Number.isFinite(H) || !Number.isFinite(CY) || !(H > 0.05)) return absY;
  const pad = Math.min(0.1, Math.max(0.02, H * 0.2));
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

    const pid = g.userData && g.userData.partId ? String(g.userData.partId) : d.id ? String(d.id) : '';
    const removed = isDoorRemovedV7(pid);
    g.visible = baseVis && !removed;
  }
}

export function createHandlesApplyRuntime(ctx: unknown): HandlesApplyRuntime {
  const App = appFromCtx(ctx);
  ensureHandlesSurface(App);
  const THREE = getThreeMaybe(App);

  const __st = getBuildStateMaybe(App) || getState(App) || {};
  const __mode = (__st && __st.mode) || getMode(App) || { primary: 'none', opts: {} };
  const __removeDoorModeId = getModeId(App, 'REMOVE_DOOR') || 'remove_door';
  const __isRemoveDoorMode = !!(__mode && __mode.primary === __removeDoorModeId);
  const __ui = (__st && __st.ui && typeof __st.ui === 'object' ? __st.ui : null) || getUi(App) || {};
  const { uiView: __uiView, stateView: __stateView } = getViewFlags(__st, __ui);

  const removeDoorsEnabled =
    !!(__ui && (__ui.removeDoorsEnabled || __ui.removeDoors)) ||
    !!(__uiView && (__uiView.removeDoorsEnabled || __uiView.removeDoors)) ||
    !!(__stateView && (__stateView.removeDoorsEnabled || __stateView.removeDoors)) ||
    __isRemoveDoorMode;

  const isDoorRemovedV7 = createDoorRemovedReader(App);
  const getEdgeHandleVariant = createEdgeHandleVariantResolver(App);
  const getHandleType = createHandleTypeResolver(App, getEdgeHandleVariant);
  const getHandleColor = createHandleColorResolver(App);
  const syncDoorVisibility = (): void =>
    syncDoorVisibilityForRemovedDoors(App, removeDoorsEnabled, isDoorRemovedV7);

  return {
    App,
    THREE,
    removeDoorsEnabled,
    isDoorRemovedV7,
    syncDoorVisibilityForRemovedDoors: syncDoorVisibility,
    getEdgeHandleVariant,
    getHandleType,
    getHandleColor,
    clampAbsYToGroup,
    removeExistingHandleChildren,
  };
}
