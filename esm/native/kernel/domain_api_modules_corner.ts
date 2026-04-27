// Canonical domain_api modules/corner installer.
//
// Why this exists:
// - domain_api.ts keeps the public domain owner surface
// - modules/corner domain behavior is still central, but too dense inline
// - this isolates the stack/module/corner policy without reintroducing legacy write paths

import { sanitizeCornerCfg } from './domain_api_modules_corner_shared.js';
import { installDomainApiModulesCornerRecompute } from './domain_api_modules_corner_recompute.js';
import { installDomainApiModulesCornerSelectors } from './domain_api_modules_corner_selectors.js';
import { installDomainApiModulesCornerModulePatch } from './domain_api_modules_corner_module_patch.js';
import { installDomainApiModulesCornerCornerPatch } from './domain_api_modules_corner_corner_patch.js';

export type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

export function installDomainApiModulesCorner(ctx: DomainApiModulesCornerContext): void {
  const { App, select, modulesActions, cornerActions, _cfg, _isRecord, _meta, _domainApiReportNonFatal } =
    ctx;

  select.modules = select.modules || {};
  select.corner = select.corner || {};

  const sanitizeCorner = (value: unknown) => sanitizeCornerCfg(App, _domainApiReportNonFatal, value);

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
    modulesActions,
    cornerActions,
    _cfg,
    _ui: ctx._ui,
    _isRecord,
    sanitizeCorner,
  });

  installDomainApiModulesCornerModulePatch(ctx);
  installDomainApiModulesCornerCornerPatch(ctx, sanitizeCorner);
}
