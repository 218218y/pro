import type { ConfigStateLike, RemovedDoorsMap } from '../../../types/index.js';
import {
  cloneCornerConfigurationForLowerSnapshot,
  readCornerConfigurationFromConfigSnapshot,
  sanitizeCornerConfigurationSnapshot,
} from '../features/modules_configuration/corner_cells_api.js';
import type { CornerBuildUI, CornerConfigRecord } from './corner_state_normalize_contracts.js';
import { asRemovedDoorsMap, ensureCornerConfigRecord } from './corner_state_normalize_shared.js';
import { isRecord } from './corner_geometry_plan.js';
import { requireCornerConfigSnapshot } from './corner_config_readers.js';
import { listCanonicalRemovedDoorLookupKeys } from '../../shared/removed_doors_map_keys_shared.js';

export type CornerNormalizedConfigState = {
  __cfg: ConfigStateLike;
  config: CornerConfigRecord;
  __removedDoorsMap: RemovedDoorsMap;
  __stackScopePartKey: (partId: unknown) => string;
  __isDoorRemoved: (partId: unknown) => boolean;
};

export function createCornerNormalizedConfigState(args: {
  cfgSnapshot: unknown;
  uiAny: CornerBuildUI;
  __stackKey: 'top' | 'bottom';
  __stackSplitEnabled: boolean;
}): CornerNormalizedConfigState {
  const { cfgSnapshot, __stackKey, __stackSplitEnabled } = args;
  const __cfg = requireCornerConfigSnapshot(cfgSnapshot);

  const __stackScopePartKey = (partId: unknown): string => {
    const pid = String(partId || '');
    if (!pid) return '';
    if (__stackKey !== 'bottom') return pid;
    if (pid.startsWith('lower_')) return pid;
    if (pid.startsWith('corner_')) return `lower_${pid}`;
    return pid;
  };

  const __removedDoorsMap: RemovedDoorsMap = asRemovedDoorsMap(__cfg.removedDoorsMap);

  const __isDoorRemoved = (pid: unknown) => {
    const kRaw = String(pid || '');
    if (!kRaw) return false;
    const scoped = __stackScopePartKey(kRaw);

    const isRemoved = (id0: string): boolean => {
      const keys = listCanonicalRemovedDoorLookupKeys(id0);
      for (let i = 0; i < keys.length; i += 1) {
        if (__removedDoorsMap[keys[i]] === true) return true;
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
