import type { NormalizedCornerConfigurationLike } from './domain_api_modules_corner_shared.js';
import type { ActionMetaLike } from '../../../types';

import { cfgSetScalar, setCfgCornerConfiguration } from '../runtime/cfg_access.js';
import { patchCornerConfigurationForStack } from '../features/modules_configuration/corner_cells_api.js';
import type { DomainApiModulesCornerContext } from './domain_api_modules_corner_contracts.js';

export function installDomainApiModulesCornerCornerPatch(
  ctx: DomainApiModulesCornerContext,
  sanitizeCorner: (value: unknown) => NormalizedCornerConfigurationLike
): void {
  const { App, cornerActions, modulesActions, _meta } = ctx;

  const patchCornerCellForStack = (
    stack: 'top' | 'bottom',
    index: unknown,
    patch: unknown,
    meta: ActionMetaLike | undefined,
    source: string
  ): unknown => {
    const i = parseInt(String(index), 10);
    if (!Number.isFinite(i) || i < 0) return null;
    const patchForStack =
      typeof modulesActions.patchForStack === 'function' ? modulesActions.patchForStack : null;
    if (typeof patchForStack !== 'function') {
      throw new Error(
        '[WardrobePro][domain_api] actions.modules.patchForStack is required before stack patch delegation.'
      );
    }
    return patchForStack(stack, `corner:${i}`, patch, _meta(meta, source));
  };

  cornerActions.setConfig =
    cornerActions.setConfig ||
    function (cfgObj: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:corner:setConfig');
      return setCfgCornerConfiguration(App, sanitizeCorner(cfgObj), m);
    };

  cornerActions.patch =
    cornerActions.patch ||
    function (patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:corner:patch');
      return cfgSetScalar(
        App,
        'cornerConfiguration',
        function (prev: unknown) {
          return patchCornerConfigurationForStack(prev, prev, 'top', patch);
        },
        m
      );
    };

  cornerActions.patchCellAt =
    cornerActions.patchCellAt ||
    function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      return patchCornerCellForStack('top', index, patch, meta, 'actions:corner:patchCellAt');
    };

  cornerActions.patchLower =
    cornerActions.patchLower ||
    function (patch: unknown, meta: ActionMetaLike | undefined) {
      const m = _meta(meta, 'actions:corner:patchLower');
      return cfgSetScalar(
        App,
        'cornerConfiguration',
        function (prev: unknown) {
          return patchCornerConfigurationForStack(prev, prev, 'bottom', patch);
        },
        m
      );
    };

  cornerActions.patchLowerCellAt =
    cornerActions.patchLowerCellAt ||
    function (index: unknown, patch: unknown, meta: ActionMetaLike | undefined) {
      return patchCornerCellForStack('bottom', index, patch, meta, 'actions:corner:patchLowerCellAt');
    };
}
