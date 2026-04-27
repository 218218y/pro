import { getUi } from './store_access.js';
import type { ActionMetaLike } from '../../../types';

import { createDefaultLowerModuleConfig } from '../features/stack_split/module_config.js';
import {
  type PatchModulesConfigurationListOptions,
  patchModulesConfigurationListAtForPatch,
  readModulesConfigurationListFromConfigSnapshot,
  sanitizeModulesConfigurationListForPatch,
} from '../features/modules_configuration/modules_config_api.js';
import {
  patchCornerConfigurationCellForStack,
  patchCornerConfigurationForStack,
  resolveTopCornerCellDefaultLayoutFromUi,
} from '../features/modules_configuration/corner_cells_api.js';

import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';

export function installKernelStateKernelConfigModulesCornerPatchSurface(
  helpers: KernelStateKernelConfigHelpers
): void {
  const {
    App,
    __sk,
    asMeta,
    asString,
    normalizeTopModuleRecord,
    asModuleConfigPatch,
    readCornerCfgFromStoreConfig,
    readLowerCornerCfgFromCornerCfg,
    readStoreConfigSnapshot,
    parseCornerCellIndex,
  } = helpers;

  const getTopModulesSanitizeOptions = (cfgSnapshot: unknown): PatchModulesConfigurationListOptions => ({
    uiSnapshot: getUi(App),
    cfgSnapshot,
  });

  const commitConfigScalar = (
    key: string,
    value: unknown,
    meta: ActionMetaLike,
    fallbackSource: string
  ): void => {
    if (__sk && typeof __sk.patchConfigScalar === 'function') {
      __sk.patchConfigScalar(key, value, Object.assign({ source: meta.source || fallbackSource }, meta));
    }
  };

  __sk.patchSplitLowerModuleConfig = function (moduleKey: string | number, patch: unknown, metaIn: unknown) {
    const meta = asMeta(metaIn);
    const idx = typeof moduleKey === 'number' ? moduleKey : parseInt(String(moduleKey), 10);
    if (!Number.isFinite(idx)) return null;

    const sc = readStoreConfigSnapshot();
    const curMods = readModulesConfigurationListFromConfigSnapshot(sc, 'stackSplitLowerModulesConfiguration');
    const nextMods = patchModulesConfigurationListAtForPatch(
      'stackSplitLowerModulesConfiguration',
      curMods,
      curMods,
      idx,
      patch
    );
    const cfg = nextMods[idx] ?? createDefaultLowerModuleConfig(idx);
    if (meta.noCommit) return cfg;

    commitConfigScalar(
      'stackSplitLowerModulesConfiguration',
      nextMods,
      meta,
      'stackSplitLowerModuleConfig.patch'
    );
    return cfg;
  };

  __sk.patchSplitLowerCornerConfig = function (patch: unknown, metaIn: unknown) {
    const meta = asMeta(metaIn);
    const sc = readStoreConfigSnapshot();
    const curCorner = readCornerCfgFromStoreConfig(sc);
    const nextCorner = patchCornerConfigurationForStack(curCorner, curCorner, 'bottom', patch);
    const nextLower = readLowerCornerCfgFromCornerCfg(nextCorner) ?? {};
    if (meta.noCommit) return nextLower;

    commitConfigScalar('cornerConfiguration', nextCorner, meta, 'stackSplitLowerCornerConfig.patch');
    return nextLower;
  };

  __sk.patchSplitLowerCornerCellConfig = function (
    indexOrKey: string | number,
    patch: unknown,
    metaIn: unknown
  ) {
    const meta = asMeta(metaIn);
    const idx = typeof indexOrKey === 'number' ? indexOrKey : parseInt(String(indexOrKey), 10);
    if (!Number.isFinite(idx)) return null;

    const sc = readStoreConfigSnapshot();
    const curCorner = readCornerCfgFromStoreConfig(sc);
    const nextCorner = patchCornerConfigurationCellForStack(curCorner, curCorner, 'bottom', idx, patch);
    const nextLower = readLowerCornerCfgFromCornerCfg(nextCorner) ?? {};
    const nextCells = readModulesConfigurationListFromConfigSnapshot(nextLower, 'modulesConfiguration');
    const cfg = nextCells[idx] ?? createDefaultLowerModuleConfig(idx);

    if (meta.noCommit) return cfg;

    commitConfigScalar(
      'cornerConfiguration',
      nextCorner,
      meta,
      `stackSplitLowerCornerCellConfig.patch:${idx}`
    );
    return cfg;
  };

  __sk.patchModuleConfig = function (moduleKey: string | number, patch: unknown, metaIn: unknown) {
    const meta = asMeta(metaIn);
    const key: unknown = moduleKey === 'corner' ? 'corner' : moduleKey;
    const cornerCellIdx = parseCornerCellIndex(key);
    const sc = readStoreConfigSnapshot();
    const curMods = readModulesConfigurationListFromConfigSnapshot(sc, 'modulesConfiguration');
    const curCorner = readCornerCfgFromStoreConfig(sc);

    if (cornerCellIdx != null) {
      const nextCorner = patchCornerConfigurationCellForStack(
        curCorner,
        curCorner,
        'top',
        cornerCellIdx,
        patch,
        {
          defaultLayout: cellIndex => resolveTopCornerCellDefaultLayoutFromUi(getUi(App), cellIndex),
          normalizeCell: (cell, index, doors) => normalizeTopModuleRecord(cell, index, doors),
        }
      );
      const nextCells = readModulesConfigurationListFromConfigSnapshot(nextCorner, 'modulesConfiguration');
      const cfg = nextCells[cornerCellIdx] ?? null;

      if (meta.noCommit) return cfg;
      commitConfigScalar('cornerConfiguration', nextCorner, meta, `cornerCellConfig.patch:${cornerCellIdx}`);
      return cfg;
    }

    if (key === 'corner') {
      const nextCorner = patchCornerConfigurationForStack(curCorner, curCorner, 'top', patch);

      if (meta.noCommit) return nextCorner;
      commitConfigScalar('cornerConfiguration', nextCorner, meta, 'cornerConfig.patch');
      return nextCorner;
    }

    const idx = typeof key === 'number' ? key : parseInt(String(key), 10);
    if (!Number.isFinite(idx)) return null;

    const nextMods = patchModulesConfigurationListAtForPatch(
      'modulesConfiguration',
      curMods,
      curMods,
      idx,
      patch,
      {
        uiSnapshot: getUi(App),
        cfgSnapshot: sc,
      }
    );
    const cfg = nextMods[idx] ?? null;

    if (meta.noCommit) return cfg;
    commitConfigScalar('modulesConfiguration', nextMods, meta, 'moduleConfig.patch');
    return cfg;
  };

  __sk.patchModuleConfigForStack = function (
    stackKeyIn: unknown,
    moduleKeyIn: unknown,
    patch: unknown,
    metaIn: unknown
  ) {
    if (!App || !__sk) return null;
    const k = __sk;
    const moduleKey = moduleKeyIn;
    const stackKey = String(stackKeyIn) === 'bottom' ? 'bottom' : 'top';
    const patchSafe = asModuleConfigPatch(patch);
    const meta = asMeta(metaIn);
    const cornerCellIdx = parseCornerCellIndex(moduleKey);

    if (cornerCellIdx != null) {
      if (stackKey === 'bottom' && typeof k.patchSplitLowerCornerCellConfig === 'function') {
        return k.patchSplitLowerCornerCellConfig(cornerCellIdx, patchSafe, meta);
      }
      return k.patchModuleConfig(`corner:${cornerCellIdx}`, patchSafe, meta);
    }

    if (moduleKey === 'corner') {
      if (stackKey === 'bottom' && typeof k.patchSplitLowerCornerConfig === 'function') {
        return k.patchSplitLowerCornerConfig(patchSafe, meta);
      }
      return k.patchModuleConfig('corner', patchSafe, meta);
    }

    const mkKey: string | number = typeof moduleKey === 'number' ? moduleKey : asString(moduleKey);
    if (stackKey === 'bottom' && typeof k.patchSplitLowerModuleConfig === 'function') {
      return k.patchSplitLowerModuleConfig(mkKey, patchSafe, meta);
    }
    return k.patchModuleConfig(mkKey, patchSafe, meta);
  };

  __sk.replaceModulesConfiguration = function (listIn: unknown, metaIn: unknown) {
    const meta = asMeta(metaIn);
    const sc = readStoreConfigSnapshot();
    const prev = readModulesConfigurationListFromConfigSnapshot(sc, 'modulesConfiguration');
    const safeList = sanitizeModulesConfigurationListForPatch(
      'modulesConfiguration',
      listIn,
      prev,
      getTopModulesSanitizeOptions(sc)
    );
    const cloned = helpers.cloneKernelValue(App, safeList, []);

    commitConfigScalar('modulesConfiguration', cloned, meta, 'modulesConfiguration.replace');
    return cloned;
  };
}
