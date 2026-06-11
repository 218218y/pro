import type {
  ActionMetaLike,
  ModuleConfigPatchLike,
  ModuleStackName,
  ModuleStackPatchKey,
  UnknownRecord,
} from '../../../types';

import { cfgSetScalar, setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import { patchModulesConfigurationListAtForPatch } from '../features/modules_configuration/modules_config_api.js';
import { asRecordOrEmpty } from './domain_api_modules_corner_shared.js';
import {
  normalizeModuleStackPatchKey,
  resolveModulePatchCompatDescriptor,
} from './domain_module_stack_patch.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

export function installDomainApiModulesCornerModulePatch(ctx: DomainApiModulesCornerContext): void {
  const { App, modulesActions, _asMeta, _isRecord, _meta, _markDelegatesStackPatch } = ctx;

  const asMetaInput = (meta: unknown): ActionMetaLike | UnknownRecord | null | undefined =>
    _isRecord(meta) ? meta : undefined;

  modulesActions.setAll =
    modulesActions.setAll ||
    function (list: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:modules:setAll');
      const next = Array.isArray(list) ? list : [];
      if (typeof modulesActions.replaceAll === 'function') {
        return modulesActions.replaceAll(next, m);
      }
      return setCfgModulesConfiguration(App, next, m);
    };

  let __domainCanonicalStackPatchDepth = 0;

  const __tryCanonicalStackPatch = (
    stack: ModuleStackName,
    moduleKey: ModuleStackPatchKey,
    patch: unknown,
    meta: ActionMetaLike
  ): unknown => {
    const patchForStack =
      typeof modulesActions.patchForStack === 'function' ? modulesActions.patchForStack : null;
    if (typeof patchForStack !== 'function') {
      throw new Error(
        '[WardrobePro][domain_api] actions.modules.patchForStack is required before stack patch delegation.'
      );
    }

    const moduleRef = normalizeModuleStackPatchKey(moduleKey);
    if (moduleRef == null) return null;

    if (__domainCanonicalStackPatchDepth > 0) {
      throw new Error('[WardrobePro][domain_api] recursive canonical stack patch delegation detected.');
    }

    __domainCanonicalStackPatchDepth += 1;
    try {
      return patchForStack(stack, moduleRef, patch, meta);
    } finally {
      __domainCanonicalStackPatchDepth -= 1;
    }
  };

  const __patchModuleListForStack = (
    stack: ModuleStackName,
    index: number,
    patch: unknown,
    meta: ActionMetaLike
  ): unknown => {
    const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : -1;
    if (i < 0) return null;

    if (stack === 'bottom') {
      return cfgSetScalar(
        App,
        'stackSplitLowerModulesConfiguration',
        function (prev: unknown) {
          return patchModulesConfigurationListAtForPatch(
            'stackSplitLowerModulesConfiguration',
            prev,
            prev,
            i,
            patch
          );
        },
        meta
      );
    }

    return cfgSetScalar(
      App,
      'modulesConfiguration',
      function (prev: unknown) {
        return patchModulesConfigurationListAtForPatch('modulesConfiguration', prev, prev, i, patch, {
          uiSnapshot: ctx._ui(),
          cfgSnapshot: ctx._cfg(),
        });
      },
      meta
    );
  };

  modulesActions.patchAt =
    modulesActions.patchAt ||
    function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:modules:patchAt');
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;
      try {
        const out = __tryCanonicalStackPatch('top', i, patch, m);
        if (out !== undefined) return out;
      } catch (_error) {}
      return __patchModuleListForStack('top', i, patch, m);
    };

  modulesActions.patchLowerAt =
    modulesActions.patchLowerAt ||
    function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:modules:patchLowerAt');
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;
      try {
        const out = __tryCanonicalStackPatch('bottom', i, patch, m);
        if (out !== undefined) return out;
      } catch (_error) {}
      return __patchModuleListForStack('bottom', i, patch, m);
    };

  try {
    _markDelegatesStackPatch(modulesActions.patchAt);
    _markDelegatesStackPatch(modulesActions.patchLowerAt);
  } catch (_error) {}

  modulesActions.patch =
    modulesActions.patch ||
    function (arg1: unknown, arg2: unknown, arg3?: unknown) {
      if (typeof arg1 === 'number') {
        const patch: ModuleConfigPatchLike = asRecordOrEmpty(arg2);
        return modulesActions.patchAt?.(arg1, patch, _asMeta(asMetaInput(arg3)));
      }

      const desc = resolveModulePatchCompatDescriptor(arg1);
      if (desc) {
        const meta = _meta(asMetaInput(arg2), 'actions:modules:patch');
        if (typeof desc.moduleKey === 'number') {
          try {
            const out = __tryCanonicalStackPatch(desc.stack, desc.moduleKey, desc.patch, meta);
            if (out !== undefined) return out;
          } catch (_error) {}
          return __patchModuleListForStack(desc.stack, desc.moduleKey, desc.patch, meta);
        }
        return __tryCanonicalStackPatch(desc.stack, desc.moduleKey, desc.patch, meta);
      }

      if (Array.isArray(arg1)) return modulesActions.setAll?.(arg1, _asMeta(asMetaInput(arg2)));
      if (arg1 && typeof arg1 === 'object') {
        const obj = asRecordOrEmpty(arg1);
        if (Array.isArray(obj.list)) return modulesActions.setAll?.(obj.list, _asMeta(asMetaInput(arg2)));
      }
      return undefined;
    };
}
