import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import {
  asRecord,
  asRecordOrEmpty,
  readCornerConfig,
  readCornerConfiguration,
  readModulesList,
  sanitizeLowerCornerCfg,
  type DomainModulesCornerSelectRoot,
  type NormalizedCornerConfigurationLike,
} from './domain_api_modules_corner_shared.js';

export interface InstallDomainApiModulesCornerSelectorsArgs {
  select: DomainModulesCornerSelectRoot;
  _cfg: () => unknown;
  _isRecord?: (v: unknown) => boolean;
  sanitizeCorner: (value: unknown) => NormalizedCornerConfigurationLike;
}

function hasSketchInternalDrawerData(value: unknown): boolean {
  const rec = asRecord(value);
  const sketchExtras = asRecord(rec?.sketchExtras);
  return Array.isArray(sketchExtras?.drawers) && sketchExtras.drawers.length > 0;
}

function hasSketchInternalDrawerDataInList(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some(hasSketchInternalDrawerData);
}

export function installDomainApiModulesCornerSelectors({
  select,
  _cfg,
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

  select.modules.hasInternalDrawers =
    select.modules.hasInternalDrawers ||
    function () {
      return hasSketchInternalDrawerDataInList(readModulesList(select));
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
      return (
        hasSketchInternalDrawerData(cornerCfg) ||
        hasSketchInternalDrawerDataInList(asRecord(cornerCfg)?.modulesConfiguration)
      );
    };

  select.corner.lowerConfig =
    select.corner.lowerConfig ||
    function () {
      const cfg = _cfg();
      const cornerCfg = readCornerConfiguration(cfg);
      return sanitizeLowerCornerCfg(asRecordOrEmpty(cornerCfg.stackSplitLower));
    };
}
