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
  normalizeModuleStack,
  parseCornerCellIndex,
  readModuleIndex,
  readModulesBucketKey,
  seedLowerCornerSnapshotForSplit,
  topCornerCellNormalizeOptions,
} from './state_api_stack_router_shared.js';

const canonicalPatchRouters = new WeakSet<object>();

export function installStateApiStackRouterPatch(ctx: StateApiStackRouterContext): void {
  const { modulesNs } = ctx;

  if (typeof modulesNs.patchForStack !== 'function' || !canonicalPatchRouters.has(modulesNs.patchForStack)) {
    const patchForStack = function patchForStack(
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
          function patchCornerCell(_prev: unknown) {
            const previous = ctx.readCfgSnapshot().cornerConfiguration;
            const base = cloneCornerConfigurationSnapshot(previous);
            const seeded = seedLowerCornerSnapshotForSplit(splitOnNow, base);
            return patchCornerConfigurationCellForStack(
              seeded,
              previous,
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
          function patchCornerRoot(_prev: unknown) {
            const previous = ctx.readCfgSnapshot().cornerConfiguration;
            const base = cloneCornerConfigurationSnapshot(previous);
            const seeded = seedLowerCornerSnapshotForSplit(splitOnNow, base);
            return patchCornerConfigurationForStack(seeded, previous, stackNorm, patch);
          },
          commitMeta
        );
      };

      const stackNorm = normalizeModuleStack(stack);
      const cornerCellIdx = parseCornerCellIndex(moduleKey);

      if (cornerCellIdx != null) {
        return patchCornerCellDirect(stackNorm, cornerCellIdx, asModulePatchLike(patchOrPatchFn));
      }
      if (moduleKey === 'corner') {
        return patchCornerRootDirect(stackNorm, asCornerPatchLike(patchOrPatchFn));
      }

      const moduleIndex = readModuleIndex(moduleKey);
      if (moduleIndex == null) return null;
      return patchListCell(readModulesBucketKey(stackNorm), moduleIndex, asModulePatchLike(patchOrPatchFn));
    };
    modulesNs.patchForStack = patchForStack;
    canonicalPatchRouters.add(patchForStack);
  }
}
