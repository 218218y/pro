import type { ActionMetaLike, ModuleStackName } from '../../../types';

import { setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

export function installDomainApiModulesCornerModulePatch(ctx: DomainApiModulesCornerContext): void {
  const { App, modulesActions, _meta, _markDelegatesStackPatch } = ctx;

  delete modulesActions.patch;

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
    moduleIndex: number,
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

    if (__domainCanonicalStackPatchDepth > 0) {
      throw new Error('[WardrobePro][domain_api] recursive canonical stack patch delegation detected.');
    }

    __domainCanonicalStackPatchDepth += 1;
    try {
      return patchForStack(stack, moduleIndex, patch, meta);
    } finally {
      __domainCanonicalStackPatchDepth -= 1;
    }
  };

  const isCanonicalStackAlias = (value: unknown): boolean =>
    typeof value === 'function' && Reflect.get(value, '__wp_delegatesStackPatch') === true;

  if (!isCanonicalStackAlias(modulesActions.patchAt)) {
    modulesActions.patchAt = function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:modules:patchAt');
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;
      return __tryCanonicalStackPatch('top', i, patch, m);
    };
    _markDelegatesStackPatch(modulesActions.patchAt);
  }

  if (!isCanonicalStackAlias(modulesActions.patchLowerAt)) {
    modulesActions.patchLowerAt = function (
      index: unknown,
      patch: unknown,
      meta: ActionMetaLike | undefined
    ) {
      const m = _meta(meta, 'actions:modules:patchLowerAt');
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;
      return __tryCanonicalStackPatch('bottom', i, patch, m);
    };
    _markDelegatesStackPatch(modulesActions.patchLowerAt);
  }
}
