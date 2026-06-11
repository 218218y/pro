import { getCfg } from '../kernel/api.js';
import { readCornerConfigurationCellForStack } from '../features/modules_configuration/corner_cells_api.js';
import {
  readModulesConfigurationListFromConfigSnapshot,
  type ModulesConfigBucketKey,
} from '../features/modules_configuration/modules_config_api.js';
import { __wp_isCornerKey } from './canvas_picking_core_helpers.js';
import type {
  AppContainer,
  HoverModuleConfigLike,
  ModuleKey,
} from './canvas_picking_interior_hover_contracts.js';
import { asHoverModuleConfig } from './canvas_picking_interior_hover_state.js';

export function readHoverModuleConfig(
  App: AppContainer,
  hitModuleKey: ModuleKey,
  isBottom: boolean
): HoverModuleConfigLike | null {
  try {
    const cfg = getCfg(App);
    if (typeof hitModuleKey === 'number') {
      const bucket: ModulesConfigBucketKey = isBottom
        ? 'stackSplitLowerModulesConfiguration'
        : 'modulesConfiguration';
      const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
      return Array.isArray(list) ? asHoverModuleConfig(list[hitModuleKey]) : null;
    }
    if (__wp_isCornerKey(hitModuleKey)) {
      let idx = 0;
      if (typeof hitModuleKey === 'string' && hitModuleKey.startsWith('corner:')) {
        const n = Number(hitModuleKey.slice('corner:'.length));
        if (Number.isFinite(n) && n >= 0) idx = Math.floor(n);
      }
      return asHoverModuleConfig(readCornerConfigurationCellForStack(cfg, isBottom ? 'bottom' : 'top', idx));
    }
  } catch {
    // ignore
  }
  return null;
}
