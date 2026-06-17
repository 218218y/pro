// Canonical domain_api modules/corner installer.
//
// Why this exists:
// - domain_api.ts keeps the public domain owner surface
// - modules/corner domain behavior is still central, but too dense inline
// - this isolates the stack/module/corner policy behind the canonical write paths

import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { sanitizeCornerCfg } from './domain_api_modules_corner_shared.js';
import { setCfgCornerConfiguration, setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import { installDomainApiModulesCornerRecompute } from './domain_api_modules_corner_recompute.js';
import { installDomainApiModulesCornerSelectors } from './domain_api_modules_corner_selectors.js';

export type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

export function installDomainApiModulesCorner(ctx: DomainApiModulesCornerContext): void {
  const { App, select, modulesActions, cornerActions, _cfg, _isRecord, _meta, _domainApiReportNonFatal } =
    ctx;

  select.modules = select.modules || {};
  select.corner = select.corner || {};

  for (const key of ['patch', 'ensureAt', 'ensureLowerAt', 'patchAt', 'patchLowerAt']) {
    delete modulesActions[key];
  }
  for (const key of [
    'ensureConfig',
    'ensureLowerConfig',
    'ensureCellAt',
    'ensureLowerCellAt',
    'patch',
    'patchLower',
    'patchCellAt',
    'patchLowerCellAt',
  ]) {
    delete cornerActions[key];
  }

  const sanitizeCorner = (value: unknown) => sanitizeCornerCfg(App, _domainApiReportNonFatal, value);

  modulesActions.setAll =
    modulesActions.setAll ||
    function (list: unknown, meta: ActionMetaLike | UnknownRecord | null | undefined) {
      const commitMeta = _meta(meta, 'actions:modules:setAll');
      const next = Array.isArray(list) ? list : [];
      return typeof modulesActions.replaceAll === 'function'
        ? modulesActions.replaceAll(next, commitMeta)
        : setCfgModulesConfiguration(App, next, commitMeta);
    };

  cornerActions.setConfig =
    cornerActions.setConfig ||
    function (cfgObj: unknown, meta: ActionMetaLike | UnknownRecord | null | undefined) {
      return setCfgCornerConfiguration(App, sanitizeCorner(cfgObj), _meta(meta, 'actions:corner:setConfig'));
    };

  installDomainApiModulesCornerRecompute({
    App,
    modulesActions,
    _cfg: ctx._cfg,
    _ui: ctx._ui,
    _isRecord,
    _meta,
    _domainApiReportNonFatal,
  });

  installDomainApiModulesCornerSelectors({
    select,
    _cfg,
    _isRecord,
    sanitizeCorner,
  });
}
