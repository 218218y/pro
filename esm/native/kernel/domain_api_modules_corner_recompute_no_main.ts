import type { AppContainer, ModulesActionsLike } from '../../../types';

import {
  sanitizeModuleConfigForNoMain,
  type DomainCornerReportNonFatal,
} from './domain_api_modules_corner_shared.js';
import {
  didRecomputedModulesChange,
  type DomainApiModulesCornerRecomputeRuntime,
} from './domain_api_modules_corner_recompute_shared.js';
import {
  applyModulesRecomputeWrite,
  requestModulesRecomputeBuild,
} from './domain_api_modules_corner_recompute_policy.js';

export function handleNoMainModulesRecompute(args: {
  App: AppContainer;
  runtime: DomainApiModulesCornerRecomputeRuntime;
  uiOverride: unknown;
  modulesActions?: ModulesActionsLike | null;
  reportNonFatal: DomainCornerReportNonFatal;
}): { ok: true; updated: boolean; modules: unknown[] } | { ok: false; reason: 'writeFailed' } {
  const { App, runtime, uiOverride, modulesActions, reportNonFatal } = args;
  const sanitizedModules = runtime.currentModules.map(sanitizeModuleConfigForNoMain);
  const modulesChanged = didRecomputedModulesChange(runtime, sanitizedModules);

  if (modulesChanged) {
    const writeResult = applyModulesRecomputeWrite({
      App,
      modulesActions,
      nextModules: sanitizedModules,
      meta: runtime.meta,
      reason: 'noMainCleanup',
      reportNonFatal,
    });
    if (writeResult.ok === false) {
      return { ok: false, reason: 'writeFailed' } as const;
    }
  }

  requestModulesRecomputeBuild(App, uiOverride, runtime.meta, 'noMain', runtime.options);
  return { ok: true, updated: modulesChanged, modules: sanitizedModules };
}
