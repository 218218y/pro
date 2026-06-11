import type {
  ActionMetaLike,
  AppContainer,
  ConfigStateLike,
  ModulesActionsLike,
  ModulesRecomputeFromUiOptionsLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

import { type DomainCornerReportNonFatal } from './domain_api_modules_corner_shared.js';
import { handleNoMainModulesRecompute } from './domain_api_modules_corner_recompute_no_main.js';
import {
  createDomainApiModulesCornerRecomputeRuntime,
  didRecomputedModulesChange,
  needsModulesRecompute,
} from './domain_api_modules_corner_recompute_shared.js';
import { buildRecomputedModules } from './domain_api_modules_corner_recompute_template.js';
import {
  applyModulesRecomputeWrite,
  requestModulesRecomputeBuild,
} from './domain_api_modules_corner_recompute_policy.js';

export interface DomainApiModulesCornerRecomputeContext {
  App: AppContainer;
  modulesActions: ModulesActionsLike;
  _cfg: () => ConfigStateLike;
  _ui: () => UiStateLike;
  _isRecord: (v: unknown) => v is UnknownRecord;
  _meta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  _domainApiReportNonFatal: DomainCornerReportNonFatal;
}

export function installDomainApiModulesCornerRecompute(ctx: DomainApiModulesCornerRecomputeContext): void {
  const { App, modulesActions, _cfg, _ui, _isRecord, _meta, _domainApiReportNonFatal } = ctx;

  modulesActions.recomputeFromUi =
    modulesActions.recomputeFromUi ||
    function (
      uiOverride: unknown,
      meta: ActionMetaLike | undefined,
      opts?: ModulesRecomputeFromUiOptionsLike
    ) {
      const runtime = createDomainApiModulesCornerRecomputeRuntime({
        modulesActions,
        _cfg,
        _ui,
        _isRecord,
        _meta,
        uiOverride,
        meta,
        opts,
      });

      if (runtime.isNoMainWardrobe) {
        return handleNoMainModulesRecompute({
          App,
          runtime,
          uiOverride,
          modulesActions,
          reportNonFatal: _domainApiReportNonFatal,
        });
      }

      if (!needsModulesRecompute(runtime)) {
        requestModulesRecomputeBuild(App, uiOverride, runtime.meta, 'noChange', runtime.options);
        return { ok: true, updated: false, modules: runtime.currentModules };
      }

      const newModules = buildRecomputedModules(runtime);
      const modulesChanged = didRecomputedModulesChange(runtime, newModules);

      if (!modulesChanged) {
        requestModulesRecomputeBuild(App, uiOverride, runtime.meta, 'noModuleChange', runtime.options);
        return { ok: true, updated: false, modules: runtime.currentModules };
      }

      const writeResult = applyModulesRecomputeWrite({
        App,
        modulesActions,
        nextModules: newModules,
        meta: runtime.meta,
        reason: 'derived',
        reportNonFatal: _domainApiReportNonFatal,
      });
      if (writeResult.ok === true) {
        return { ok: true, updated: true, modules: newModules };
      }

      return { ok: false, reason: 'writeFailed' } as const;
    };
}
