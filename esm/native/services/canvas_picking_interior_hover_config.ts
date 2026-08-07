import { getCfg, getUi } from '../kernel/api.js';
import {
  ensureCornerConfigurationCellForStack,
  readCornerConfigurationCellForStack,
  resolveTopCornerCellDefaultLayoutFromUi,
} from '../features/modules_configuration/corner_cells_api.js';
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

function readCornerRootFromConfigSnapshot(cfg: unknown): unknown {
  return cfg && typeof cfg === 'object' && !Array.isArray(cfg)
    ? (cfg as { cornerConfiguration?: unknown }).cornerConfiguration
    : null;
}

function readMaterializedCornerHoverConfig(
  App: AppContainer,
  cfg: unknown,
  idx: number,
  isBottom: boolean
): HoverModuleConfigLike | null {
  const existing = readCornerConfigurationCellForStack(cfg, isBottom ? 'bottom' : 'top', idx);
  const stack = isBottom ? 'bottom' : 'top';
  if (existing) return asHoverModuleConfig(existing);

  const cornerRoot = readCornerRootFromConfigSnapshot(cfg);
  const materialized = ensureCornerConfigurationCellForStack(
    cornerRoot,
    cornerRoot,
    stack,
    idx,
    isBottom
      ? undefined
      : {
          defaultLayout: cellIndex => resolveTopCornerCellDefaultLayoutFromUi(getUi(App), cellIndex),
        }
  );

  return asHoverModuleConfig(readCornerConfigurationCellForStack(materialized, stack, idx));
}

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
      return readMaterializedCornerHoverConfig(App, cfg, idx, isBottom);
    }
  } catch {
    // hover-config-read-fallback: malformed optional interior configuration disables this hover candidate only
  }
  return null;
}
