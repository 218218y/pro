import type { NormalizedCornerConfigurationLike } from './domain_api_modules_corner_shared.js';
import type { ActionMetaLike } from '../../../types';

import { setCfgCornerConfiguration } from '../runtime/cfg_access.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

const canonicalCornerPatchAliases = new WeakSet<object>();

export function installDomainApiModulesCornerCornerPatch(
  ctx: DomainApiModulesCornerContext,
  sanitizeCorner: (value: unknown) => NormalizedCornerConfigurationLike
): void {
  const { App, cornerActions, modulesActions, _meta } = ctx;

  const patchCornerForStack = (
    stack: 'top' | 'bottom',
    moduleKey: number | 'corner',
    patch: unknown,
    meta: ActionMetaLike | undefined,
    source: string
  ): unknown => {
    const patchForStack =
      typeof modulesActions.patchForStack === 'function' ? modulesActions.patchForStack : null;
    if (typeof patchForStack !== 'function') {
      throw new Error(
        '[WardrobePro][domain_api] actions.modules.patchForStack is required before stack patch delegation.'
      );
    }
    const key = moduleKey === 'corner' ? moduleKey : `corner:${moduleKey}`;
    return patchForStack(stack, key, patch, _meta(meta, source));
  };

  const patchCornerCellForStack = (
    stack: 'top' | 'bottom',
    index: unknown,
    patch: unknown,
    meta: ActionMetaLike | undefined,
    source: string
  ): unknown => {
    const i = parseInt(String(index), 10);
    if (!Number.isFinite(i) || i < 0) return null;
    return patchCornerForStack(stack, i, patch, meta, source);
  };

  const isCanonicalCornerPatchAlias = (value: unknown): boolean =>
    typeof value === 'function' && canonicalCornerPatchAliases.has(value);

  cornerActions.setConfig =
    cornerActions.setConfig ||
    function (cfgObj: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:corner:setConfig');
      return setCfgCornerConfiguration(App, sanitizeCorner(cfgObj), m);
    };

  if (!isCanonicalCornerPatchAlias(cornerActions.patch)) {
    const patch = function (value: unknown, meta: ActionMetaLike | undefined) {
      return patchCornerForStack('top', 'corner', value, meta, 'actions:corner:patch');
    };
    cornerActions.patch = patch;
    canonicalCornerPatchAliases.add(patch);
  }

  if (!isCanonicalCornerPatchAlias(cornerActions.patchCellAt)) {
    const patchCellAt = function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      return patchCornerCellForStack('top', index, patch, meta, 'actions:corner:patchCellAt');
    };
    cornerActions.patchCellAt = patchCellAt;
    canonicalCornerPatchAliases.add(patchCellAt);
  }

  if (!isCanonicalCornerPatchAlias(cornerActions.patchLower)) {
    const patchLower = function (patch: unknown, meta: ActionMetaLike | undefined) {
      return patchCornerForStack('bottom', 'corner', patch, meta, 'actions:corner:patchLower');
    };
    cornerActions.patchLower = patchLower;
    canonicalCornerPatchAliases.add(patchLower);
  }

  if (!isCanonicalCornerPatchAlias(cornerActions.patchLowerCellAt)) {
    const patchLowerCellAt = function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      return patchCornerCellForStack('bottom', index, patch, meta, 'actions:corner:patchLowerCellAt');
    };
    cornerActions.patchLowerCellAt = patchLowerCellAt;
    canonicalCornerPatchAliases.add(patchLowerCellAt);
  }
}
