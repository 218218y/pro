import type { CornerActionsLike, ModulesActionsLike } from '../../../types';

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
  modulesActions: ModulesActionsLike;
  cornerActions: CornerActionsLike;
  _cfg: () => unknown;
  _isRecord?: (v: unknown) => boolean;
  sanitizeCorner: (value: unknown) => NormalizedCornerConfigurationLike;
}

const canonicalEnsureAliases = new WeakSet<object>();

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
  modulesActions,
  cornerActions,
  _cfg,
  sanitizeCorner,
}: InstallDomainApiModulesCornerSelectorsArgs): void {
  const requireEnsureForStack = () => {
    const ensureForStack = modulesActions.ensureForStack;
    if (typeof ensureForStack !== 'function') {
      throw new Error(
        '[WardrobePro][domain_api] actions.modules.ensureForStack is required before stack ensure delegation.'
      );
    }
    return ensureForStack;
  };

  const readIndex = (index: unknown): number | null => {
    const parsed = parseInt(String(index), 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const isCanonicalEnsureAlias = (value: unknown): boolean =>
    typeof value === 'function' && canonicalEnsureAliases.has(value);

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

  if (!isCanonicalEnsureAlias(modulesActions.ensureAt)) {
    const ensureAt = function (index: unknown) {
      const i = readIndex(index);
      return i == null ? null : requireEnsureForStack()('top', i);
    };
    modulesActions.ensureAt = ensureAt;
    canonicalEnsureAliases.add(ensureAt);
  }

  if (!isCanonicalEnsureAlias(modulesActions.ensureLowerAt)) {
    const ensureLowerAt = function (index: unknown) {
      const i = readIndex(index);
      return i == null ? null : requireEnsureForStack()('bottom', i);
    };
    modulesActions.ensureLowerAt = ensureLowerAt;
    canonicalEnsureAliases.add(ensureLowerAt);
  }

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

  if (!isCanonicalEnsureAlias(cornerActions.ensureConfig)) {
    const ensureConfig = function () {
      return requireEnsureForStack()('top', 'corner');
    };
    cornerActions.ensureConfig = ensureConfig;
    canonicalEnsureAliases.add(ensureConfig);
  }

  select.corner.lowerConfig =
    select.corner.lowerConfig ||
    function () {
      const cfg = _cfg();
      const cornerCfg = readCornerConfiguration(cfg);
      return sanitizeLowerCornerCfg(asRecordOrEmpty(cornerCfg.stackSplitLower));
    };

  if (!isCanonicalEnsureAlias(cornerActions.ensureLowerConfig)) {
    const ensureLowerConfig = function () {
      return requireEnsureForStack()('bottom', 'corner');
    };
    cornerActions.ensureLowerConfig = ensureLowerConfig;
    canonicalEnsureAliases.add(ensureLowerConfig);
  }

  if (!isCanonicalEnsureAlias(cornerActions.ensureCellAt)) {
    const ensureCellAt = function (index: unknown) {
      const i = readIndex(index);
      return i == null ? null : requireEnsureForStack()('top', `corner:${i}`);
    };
    cornerActions.ensureCellAt = ensureCellAt;
    canonicalEnsureAliases.add(ensureCellAt);
  }

  if (!isCanonicalEnsureAlias(cornerActions.ensureLowerCellAt)) {
    const ensureLowerCellAt = function (index: unknown) {
      const i = readIndex(index);
      return i == null ? null : requireEnsureForStack()('bottom', `corner:${i}`);
    };
    cornerActions.ensureLowerCellAt = ensureLowerCellAt;
    canonicalEnsureAliases.add(ensureLowerCellAt);
  }
}
