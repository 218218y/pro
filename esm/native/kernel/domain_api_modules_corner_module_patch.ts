import type { ActionMetaLike, ModuleStackName } from '../../../types';

import { setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

const canonicalModulePatchAliases = new WeakSet<object>();

export function installDomainApiModulesCornerModulePatch(ctx: DomainApiModulesCornerContext): void {
  const { App, modulesActions, _meta } = ctx;

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

  const patchCanonicalStack = (
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

    return patchForStack(stack, moduleIndex, patch, meta);
  };

  const isCanonicalStackAlias = (value: unknown): boolean =>
    typeof value === 'function' && canonicalModulePatchAliases.has(value);

  if (!isCanonicalStackAlias(modulesActions.patchAt)) {
    const patchAt = function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:modules:patchAt');
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;
      return patchCanonicalStack('top', i, patch, m);
    };
    modulesActions.patchAt = patchAt;
    canonicalModulePatchAliases.add(patchAt);
  }

  if (!isCanonicalStackAlias(modulesActions.patchLowerAt)) {
    const patchLowerAt = function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:modules:patchLowerAt');
      const i = parseInt(String(index), 10);
      if (!Number.isFinite(i) || i < 0) return null;
      return patchCanonicalStack('bottom', i, patch, m);
    };
    modulesActions.patchLowerAt = patchLowerAt;
    canonicalModulePatchAliases.add(patchLowerAt);
  }
}
