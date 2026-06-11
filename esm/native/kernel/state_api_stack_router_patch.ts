import { patchModulesConfigurationListAtForPatch } from '../features/modules_configuration/modules_config_api.js';
import {
  cloneCornerConfigurationSnapshot,
  patchCornerConfigurationCellForStack,
  patchCornerConfigurationForStack,
} from '../features/modules_configuration/corner_cells_api.js';
import type {
  CornerPatchLike,
  ModulePatchLike,
  ModuleStackName,
  ModulesBucketKey,
  StateApiStackRouterContext,
} from './state_api_stack_router_shared.js';
import {
  asCornerPatchLike,
  asModulePatchLike,
  asPatchAt,
  asPatchRoot,
  isDelegatingStackPatchFn,
  normalizeModuleStack,
  parseCornerCellIndex,
  readModuleIndex,
  readModulesBucketKey,
  seedLowerCornerSnapshotForSplit,
  topCornerCellNormalizeOptions,
} from './state_api_stack_router_shared.js';

export function installStateApiStackRouterPatch(ctx: StateApiStackRouterContext): void {
  const { modulesNs, cornerNs, safeCall } = ctx;

  if (typeof modulesNs.patchForStack !== 'function') {
    modulesNs.patchForStack = function patchForStack(
      stack: unknown,
      moduleKey: unknown,
      patchOrPatchFn: unknown,
      meta
    ) {
      const commitMeta = ctx.normMeta(meta, 'actions:modules:patchForStack');
      const splitOnNow = !!ctx.readUiSnapshot().stackSplitEnabled;

      const patchListCell = (bucketKey: ModulesBucketKey, index: number, patch: ModulePatchLike) => {
        if (!ctx.getSetCfgScalar()) return undefined;
        return ctx.callSetCfgScalar(
          bucketKey,
          function patchModulesList(prev: unknown) {
            return patchModulesConfigurationListAtForPatch(bucketKey, prev, prev, index, patch, {
              uiSnapshot: ctx.readUiSnapshot(),
              cfgSnapshot: ctx.readCfgSnapshot(),
            });
          },
          commitMeta
        );
      };

      const patchCornerCellDirect = (stackNorm: ModuleStackName, idx: number, patch: ModulePatchLike) => {
        if (!ctx.getSetCfgScalar()) return undefined;
        return ctx.callSetCfgScalar(
          'cornerConfiguration',
          function patchCornerCell(prev: unknown) {
            const base = cloneCornerConfigurationSnapshot(prev);
            const seeded = seedLowerCornerSnapshotForSplit(splitOnNow, base);
            return patchCornerConfigurationCellForStack(
              seeded,
              prev,
              stackNorm,
              idx,
              patch,
              stackNorm === 'top' ? topCornerCellNormalizeOptions(ctx) : undefined
            );
          },
          commitMeta
        );
      };

      const patchCornerRootDirect = (stackNorm: ModuleStackName, patch: CornerPatchLike) => {
        if (!ctx.getSetCfgScalar()) return undefined;
        return ctx.callSetCfgScalar(
          'cornerConfiguration',
          function patchCornerRoot(prev: unknown) {
            const base = cloneCornerConfigurationSnapshot(prev);
            const seeded = seedLowerCornerSnapshotForSplit(splitOnNow, base);
            return patchCornerConfigurationForStack(seeded, prev, stackNorm, patch);
          },
          commitMeta
        );
      };

      return safeCall(() => {
        const stackNorm = normalizeModuleStack(stack);
        const cornerCellIdx = parseCornerCellIndex(moduleKey);

        if (cornerCellIdx != null) {
          if (stackNorm === 'bottom') {
            const fnLower = asPatchAt(cornerNs['patchLowerCellAt']);
            if (typeof fnLower === 'function' && !isDelegatingStackPatchFn(fnLower)) {
              return fnLower(cornerCellIdx, asModulePatchLike(patchOrPatchFn), commitMeta);
            }
          }
          const fnTop = asPatchAt(cornerNs['patchCellAt']);
          if (typeof fnTop === 'function' && !isDelegatingStackPatchFn(fnTop)) {
            return fnTop(cornerCellIdx, asModulePatchLike(patchOrPatchFn), commitMeta);
          }
        } else if (moduleKey === 'corner') {
          if (stackNorm === 'bottom') {
            const fnLower = asPatchRoot(cornerNs['patchLower']);
            if (typeof fnLower === 'function' && !isDelegatingStackPatchFn(fnLower)) {
              return fnLower(asCornerPatchLike(patchOrPatchFn), commitMeta);
            }
          }
          const fnTop = asPatchRoot(cornerNs['patch']);
          if (typeof fnTop === 'function' && !isDelegatingStackPatchFn(fnTop)) {
            return fnTop(asCornerPatchLike(patchOrPatchFn), commitMeta);
          }
        } else {
          const moduleIndex = readModuleIndex(moduleKey);
          if (moduleIndex != null) {
            if (stackNorm === 'bottom') {
              const patchLowerAt = asPatchAt(modulesNs['patchLowerAt']);
              if (patchLowerAt && !isDelegatingStackPatchFn(patchLowerAt)) {
                return patchLowerAt(moduleIndex, asModulePatchLike(patchOrPatchFn), commitMeta);
              }
            } else {
              const patchAt = asPatchAt(modulesNs['patchAt']);
              if (patchAt && !isDelegatingStackPatchFn(patchAt)) {
                return patchAt(moduleIndex, asModulePatchLike(patchOrPatchFn), commitMeta);
              }
            }
          }
        }

        if (cornerCellIdx != null) {
          return patchCornerCellDirect(stackNorm, cornerCellIdx, asModulePatchLike(patchOrPatchFn));
        }
        if (moduleKey === 'corner') {
          return patchCornerRootDirect(stackNorm, asCornerPatchLike(patchOrPatchFn));
        }

        const moduleIndex = readModuleIndex(moduleKey);
        if (moduleIndex == null) return null;
        return patchListCell(readModulesBucketKey(stackNorm), moduleIndex, asModulePatchLike(patchOrPatchFn));
      });
    };
  }
}
