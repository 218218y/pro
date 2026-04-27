import type { CornerActionsLike, ModulesActionsLike } from '../../../types';

import {
  ensureModulesConfigurationItemFromConfigSnapshot,
  readModulesConfigurationListFromConfigSnapshot,
} from '../features/modules_configuration/modules_config_api.js';
import {
  readCornerConfigurationCellForStack,
  readCornerConfigurationCellListForStack,
  ensureCornerConfigurationCellForStack,
  resolveTopCornerCellDefaultLayoutFromUi,
} from '../features/modules_configuration/corner_cells_api.js';
import {
  asRecord,
  asRecordOrEmpty,
  readCornerConfig,
  readCornerConfiguration,
  readLowerCornerConfig,
  readModulesList,
  sanitizeLowerCornerCfg,
  type DomainModulesCornerSelectRoot,
  type NormalizedCornerConfigurationLike,
} from './domain_api_modules_corner_shared.js';

export interface InstallDomainApiModulesCornerSelectorsArgs {
  select: DomainModulesCornerSelectRoot;
  modulesActions: ModulesActionsLike;
  cornerActions: CornerActionsLike;
  _cfg: () => unknown;
  _ui: () => unknown;
  _isRecord?: (v: unknown) => boolean;
  sanitizeCorner: (value: unknown) => NormalizedCornerConfigurationLike;
}

export function installDomainApiModulesCornerSelectors({
  select,
  modulesActions,
  cornerActions,
  _cfg,
  _ui,
  sanitizeCorner,
}: InstallDomainApiModulesCornerSelectorsArgs): void {
  select.modules.list =
    select.modules.list ||
    function () {
      const cfg = _cfg();
      return readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
    };

  select.modules.count =
    select.modules.count ||
    function () {
      return readModulesList(select).length;
    };

  select.modules.get =
    select.modules.get ||
    function (index: unknown) {
      const list = readModulesList(select);
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0 || i >= list.length) return null;
      return list[i] || null;
    };

  modulesActions.ensureAt =
    modulesActions.ensureAt ||
    function (index: unknown) {
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;

      return ensureModulesConfigurationItemFromConfigSnapshot(_cfg(), 'modulesConfiguration', i, {
        uiSnapshot: _ui(),
        cfgSnapshot: _cfg(),
      });
    };

  modulesActions.ensureLowerAt =
    modulesActions.ensureLowerAt ||
    function (index: unknown) {
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;

      return ensureModulesConfigurationItemFromConfigSnapshot(
        _cfg(),
        'stackSplitLowerModulesConfiguration',
        i
      );
    };

  select.modules.hasInternalDrawers =
    select.modules.hasInternalDrawers ||
    function () {
      const list = readModulesList(select);
      for (let i = 0; i < list.length; i++) {
        const moduleCfg = list[i] || {};
        if (moduleCfg && typeof moduleCfg === 'object') {
          if (Array.isArray(moduleCfg.intDrawersList) && moduleCfg.intDrawersList.length > 0) return true;
          if (typeof moduleCfg.intDrawersSlot === 'number' && moduleCfg.intDrawersSlot > 0) return true;
        }
      }
      return false;
    };

  select.corner.config =
    select.corner.config ||
    function () {
      const cfg = _cfg();
      return sanitizeCorner(readCornerConfiguration(cfg));
    };

  select.corner.hasInternalDrawers =
    select.corner.hasInternalDrawers ||
    function () {
      const cornerCfg = readCornerConfig(select);
      return !!(cornerCfg && Array.isArray(cornerCfg.intDrawersList) && cornerCfg.intDrawersList.length > 0);
    };

  cornerActions.ensureConfig =
    cornerActions.ensureConfig ||
    function () {
      return readCornerConfig(select);
    };

  select.corner.lowerConfig =
    select.corner.lowerConfig ||
    function () {
      const cfg = _cfg();
      const cornerCfg = readCornerConfiguration(cfg);
      return sanitizeLowerCornerCfg(asRecordOrEmpty(cornerCfg.stackSplitLower));
    };

  cornerActions.ensureLowerConfig =
    cornerActions.ensureLowerConfig ||
    function () {
      return readLowerCornerConfig(select);
    };

  cornerActions.ensureCellAt =
    cornerActions.ensureCellAt ||
    function (index: unknown) {
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;

      const cfg = _cfg();
      const cornerCfg = readCornerConfiguration(cfg);
      const ensured = ensureCornerConfigurationCellForStack(cornerCfg, cornerCfg, 'top', i, {
        defaultLayout: index => resolveTopCornerCellDefaultLayoutFromUi(_ui(), index),
      });
      return asRecord(readCornerConfigurationCellForStack(ensured, 'top', i)) || null;
    };

  cornerActions.ensureLowerCellAt =
    cornerActions.ensureLowerCellAt ||
    function (index: unknown) {
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;

      const cfg = _cfg();
      const cornerCfg = readCornerConfiguration(cfg);
      const ensured = ensureCornerConfigurationCellForStack(cornerCfg, cornerCfg, 'bottom', i);
      const cells = readCornerConfigurationCellListForStack(ensured, 'bottom');
      return asRecord(cells[i]) || null;
    };
}
