import type { AppContainer, UnknownRecord } from '../../../types';
import { getCfg } from '../kernel/api.js';
import { asRecord } from '../runtime/record.js';
import {
  readCornerConfigurationCellForStack,
  readCornerConfigurationSnapshotForStack,
} from '../features/modules_configuration/corner_cells_api.js';
import { type ModuleKey } from './canvas_picking_hover_targets_shared.js';
import {
  readModulesConfigurationListFromConfigSnapshot,
  type ModulesConfigBucketKey,
} from '../features/modules_configuration/modules_config_api.js';

export function readInteriorModuleConfigRef(
  App: AppContainer,
  moduleKey: ModuleKey,
  isBottom: boolean
): UnknownRecord | null {
  try {
    const cfg = asRecord(getCfg(App));
    if (typeof moduleKey === 'number') {
      const bucket: ModulesConfigBucketKey = isBottom
        ? 'stackSplitLowerModulesConfiguration'
        : 'modulesConfiguration';
      const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
      return Array.isArray(list) ? asRecord(list[moduleKey]) : null;
    }
    if (moduleKey === 'corner' || (typeof moduleKey === 'string' && moduleKey.startsWith('corner:'))) {
      let idx = 0;
      if (typeof moduleKey === 'string' && moduleKey.startsWith('corner:')) {
        const n = Number(moduleKey.slice('corner:'.length));
        if (Number.isFinite(n) && n >= 0) idx = Math.floor(n);
      }
      if (moduleKey === 'corner') {
        return asRecord(readCornerConfigurationSnapshotForStack(cfg, isBottom ? 'bottom' : 'top')) || null;
      }
      return asRecord(readCornerConfigurationCellForStack(cfg, isBottom ? 'bottom' : 'top', idx)) || null;
    }
  } catch {
    // ignore
  }
  return null;
}
