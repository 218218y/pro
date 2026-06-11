import type { AppContainer, ConfigStateLike, RemovedDoorsMap } from '../../../types/index.js';
import { readMap } from '../runtime/maps_access.js';
import { getCfg } from './store_access.js';
import {
  cloneCornerConfigurationForLowerSnapshot,
  readCornerConfigurationFromConfigSnapshot,
  sanitizeCornerConfigurationSnapshot,
} from '../features/modules_configuration/corner_cells_api.js';
import type { CornerBuildUI, CornerConfigRecord } from './corner_state_normalize_contracts.js';
import { asRemovedDoorsMap, ensureCornerConfigRecord } from './corner_state_normalize_shared.js';
import { isRecord } from './corner_geometry_plan.js';

export type CornerNormalizedConfigState = {
  __cfg: ConfigStateLike;
  config: CornerConfigRecord;
  __removedDoorsMap: RemovedDoorsMap;
  __stackScopePartKey: (partId: unknown) => string;
  __isDoorRemoved: (partId: unknown) => boolean;
};

export function createCornerNormalizedConfigState(args: {
  App: AppContainer;
  uiAny: CornerBuildUI;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerNormalizedConfigState {
  const { App, __stackKey, __stackSplitEnabled } = args;
  const __cfg = getCfg(App);

  const __stackScopePartKey = (partId: unknown): string => {
    const pid = String(partId || '');
    if (!pid) return '';
    if (__stackKey !== 'bottom') return pid;
    if (pid.startsWith('lower_')) return pid;
    if (pid.startsWith('corner_')) return `lower_${pid}`;
    return pid;
  };

  const removedDoorsMapCandidate = asRemovedDoorsMap(readMap(App, 'removedDoorsMap'));
  const cfgRemovedDoorsMap = asRemovedDoorsMap(__cfg.removedDoorsMap);
  const __removedDoorsMap: RemovedDoorsMap =
    Object.keys(removedDoorsMapCandidate).length > 0 ? removedDoorsMapCandidate : cfgRemovedDoorsMap;

  const __isDoorRemoved = (pid: unknown) => {
    const kRaw = String(pid || '');
    if (!kRaw) return false;
    const scoped = __stackScopePartKey(kRaw);

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
      const map = __removedDoorsMap;
      if (!!map[`removed_${id}`]) return true;

      if (id.endsWith('_top') || id.endsWith('_mid') || id.endsWith('_bot')) {
        const full = id.replace(/_(top|mid|bot)$/i, '_full');
        return !!map[`removed_${full}`];
      }

      return false;
    };

    if (isRemoved(scoped)) return true;
    if (!(__stackSplitEnabled && __stackKey === 'bottom') && scoped !== kRaw && isRemoved(kRaw)) return true;
    return false;
  };

  const __rawCornerCfg = readCornerConfigurationFromConfigSnapshot(__cfg);
  const __baseCornerCfg = sanitizeCornerConfigurationSnapshot(__rawCornerCfg || {});

  const __lowerCornerCfg = (() => {
    if (!__stackSplitEnabled || __stackKey !== 'bottom') return null;
    if (!isRecord(__baseCornerCfg)) return null;
    const lower = __baseCornerCfg.stackSplitLower;
    if (isRecord(lower)) return lower;
    return cloneCornerConfigurationForLowerSnapshot(__baseCornerCfg);
  })();

  const config = ensureCornerConfigRecord(__lowerCornerCfg || __baseCornerCfg);

  return {
    __cfg,
    config,
    __removedDoorsMap,
    __stackScopePartKey,
    __isDoorRemoved,
  };
}
