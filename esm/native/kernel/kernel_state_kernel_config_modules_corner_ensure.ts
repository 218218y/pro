import { getUi } from './store_access.js';
import { createDefaultLowerModuleConfig } from '../features/stack_split/module_config.js';
import {
  ensureModulesConfigurationItemFromConfigSnapshot,
  readModulesConfigurationListFromConfigSnapshot,
} from '../features/modules_configuration/modules_config_api.js';
import { readDoorsCount } from '../features/modules_configuration/modules_config_contracts.js';
import {
  ensureCornerConfigurationCellForStack,
  ensureCornerConfigurationForStack,
  resolveTopCornerCellDefaultLayoutFromUi,
} from '../features/modules_configuration/corner_cells_api.js';

import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';
import type { NormalizedTopModuleConfigLike } from '../../../types';

function readTopModuleRecordAt(
  helpers: KernelStateKernelConfigHelpers,
  value: unknown,
  index: number,
  fallbackDoors = 2
): NormalizedTopModuleConfigLike | null {
  if (!helpers.isRecord(value)) return null;
  return helpers.normalizeTopModuleRecord(value, index, readDoorsCount(value, fallbackDoors));
}

export function installKernelStateKernelConfigModulesCornerEnsureSurface(
  helpers: KernelStateKernelConfigHelpers
): void {
  const {
    App,
    __sk,
    asString,
    normalizeLowerModuleRecord,
    asCornerConfiguration,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
    readStoreConfigSnapshot,
    parseCornerCellIndex,
    normalizeSplitLowerCornerConfig,
  } = helpers;

  __sk.ensureModuleConfig = function (indexOrKey: string | number) {
    const idx = typeof indexOrKey === 'number' ? indexOrKey : parseInt(indexOrKey, 10);
    if (!Number.isFinite(idx)) return null;

    const cfg = readStoreConfigSnapshot();
    return readTopModuleRecordAt(
      helpers,
      ensureModulesConfigurationItemFromConfigSnapshot(cfg, 'modulesConfiguration', idx, {
        uiSnapshot: getUi(App),
        cfgSnapshot: cfg,
      }),
      idx
    );
  };

  __sk.ensureSplitLowerModuleConfig = function (indexOrKey: string | number) {
    const idx = typeof indexOrKey === 'number' ? indexOrKey : parseInt(indexOrKey, 10);
    if (!Number.isFinite(idx)) return null;

    return helpers.asRecord(
      ensureModulesConfigurationItemFromConfigSnapshot(
        readStoreConfigSnapshot(),
        'stackSplitLowerModulesConfiguration',
        idx
      ),
      {}
    );
  };

  __sk.ensureCornerConfig = function () {
    const sc = readStoreConfigSnapshot();
    return asCornerConfiguration(
      ensureCornerConfigurationForStack(sc.cornerConfiguration, sc.cornerConfiguration, 'top')
    );
  };

  __sk.ensureCornerCellConfig = function (indexOrKey: string | number) {
    const idx = typeof indexOrKey === 'number' ? indexOrKey : parseInt(String(indexOrKey), 10);
    if (!Number.isFinite(idx)) return null;

    const sc = readStoreConfigSnapshot();
    const rawCorner = readCornerCfgFromStoreConfig(sc);
    const ensured = ensureCornerConfigurationCellForStack(rawCorner, rawCorner, 'top', idx, {
      defaultLayout: cellIndex => resolveTopCornerCellDefaultLayoutFromUi(getUi(App), cellIndex),
      normalizeCell: (cell, index, doors) => helpers.normalizeTopModuleRecord(cell, index, doors),
    });
    const list = readModulesConfigurationListFromConfigSnapshot(ensured, 'modulesConfiguration');
    return readTopModuleRecordAt(helpers, list[idx], idx);
  };

  __sk.ensureSplitLowerCornerConfig = function () {
    const sc = readStoreConfigSnapshot();
    const cornerCfg = readCornerCfgFromStoreConfig(sc);
    const rawLower = readLowerCornerCfgFromCornerCfg(cornerCfg);
    return normalizeSplitLowerCornerConfig(rawLower);
  };

  __sk.ensureSplitLowerCornerCellConfig = function (indexOrKey: string | number) {
    const idx = typeof indexOrKey === 'number' ? indexOrKey : parseInt(String(indexOrKey), 10);
    if (!Number.isFinite(idx)) return null;

    const sc = readStoreConfigSnapshot();
    const cornerCfg = readCornerCfgFromStoreConfig(sc);
    const rawLower = readLowerCornerCfgFromCornerCfg(cornerCfg);
    const list = readModulesConfigurationListFromConfigSnapshot(rawLower, 'modulesConfiguration');
    const raw = list[idx];
    const base = helpers.isRecord(raw) ? raw : createDefaultLowerModuleConfig(idx);
    return normalizeLowerModuleRecord(base, idx);
  };

  __sk.ensureModuleConfigForStack = function (stackKeyIn: unknown, moduleKeyIn: unknown) {
    if (!App || !__sk) return null;
    const stackKey = String(stackKeyIn) === 'bottom' ? 'bottom' : 'top';
    const moduleKey = moduleKeyIn;
    if (moduleKey == null) return null;

    const cornerCellIdx = parseCornerCellIndex(moduleKey);
    if (cornerCellIdx != null) {
      if (stackKey === 'bottom' && typeof __sk.ensureSplitLowerCornerCellConfig === 'function') {
        return __sk.ensureSplitLowerCornerCellConfig(cornerCellIdx);
      }
      return typeof __sk.ensureCornerCellConfig === 'function'
        ? __sk.ensureCornerCellConfig(cornerCellIdx)
        : null;
    }

    if (moduleKey === 'corner') {
      if (stackKey === 'bottom' && typeof __sk.ensureSplitLowerCornerConfig === 'function') {
        return __sk.ensureSplitLowerCornerConfig();
      }
      return typeof __sk.ensureCornerConfig === 'function' ? __sk.ensureCornerConfig() : null;
    }

    const mkKey: string | number = typeof moduleKey === 'number' ? moduleKey : asString(moduleKey);
    if (stackKey === 'bottom' && typeof __sk.ensureSplitLowerModuleConfig === 'function') {
      return __sk.ensureSplitLowerModuleConfig(mkKey);
    }
    return typeof __sk.ensureModuleConfig === 'function' ? __sk.ensureModuleConfig(mkKey) : null;
  };
}
