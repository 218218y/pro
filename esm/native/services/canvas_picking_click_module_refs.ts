import type { ActionMetaLike, AppContainer, ModuleConfigLike, ModulesActionsLike } from '../../../types';
import { getModulesActionFn, getModulesActions } from '../runtime/actions_access_domains.js';
import type { CanvasPickingClickModuleRefs, ModuleKey } from './canvas_picking_click_contracts.js';

function isModuleConfigLike(value: unknown): value is ModuleConfigLike {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function createCanvasPickingClickModuleRefs(args: {
  App: AppContainer;
  foundModuleIndex: ModuleKey | null;
  foundModuleStack: 'top' | 'bottom';
}): CanvasPickingClickModuleRefs {
  const { App, foundModuleIndex, foundModuleStack } = args;
  const __activeModuleKey = foundModuleIndex;
  const __activeStack = foundModuleStack === 'bottom' ? 'bottom' : 'top';
  const __isBottomStack = __activeStack === 'bottom';

  const __getModulesActionsMaybe = (): ModulesActionsLike | null => getModulesActions(App);

  const __ensureConfigRefForKey = (mk: ModuleKey | 'corner' | null) => {
    if (mk == null) return null;

    try {
      const ensureForStack = getModulesActionFn<
        (stack: string, key: ModuleKey | 'corner') => ModuleConfigLike | null
      >(App, 'ensureForStack');
      if (ensureForStack) {
        const got = ensureForStack(__activeStack, mk);
        if (isModuleConfigLike(got)) return got;
      }
    } catch (_e) {
      // Canonical surface missing/failed: keep canvas resilient by treating as no-op.
    }

    return null;
  };

  const __patchConfigForKey = (
    mk: ModuleKey | 'corner' | null,
    patchFn: (cfg: ModuleConfigLike) => void,
    meta: ActionMetaLike
  ) => {
    if (mk == null) return;

    try {
      const mods = __getModulesActionsMaybe();
      if (mods && typeof mods.patchForStack === 'function') {
        return mods.patchForStack(__activeStack, mk, patchFn, meta);
      }
    } catch (_e) {
      // Canonical surface missing/failed: keep canvas resilient by treating as no-op.
    }

    return undefined;
  };

  const __getActiveConfigRef = () => __ensureConfigRefForKey(__activeModuleKey);

  const __ensureCornerCellConfigRef = (cellIdx: number): ModuleConfigLike | null => {
    try {
      const mods = __getModulesActionsMaybe();
      const viaActions =
        mods && typeof mods.ensureCornerCellAt === 'function'
          ? mods.ensureCornerCellAt(cellIdx)
          : mods && typeof mods.ensureForStack === 'function'
            ? mods.ensureForStack('top', `corner:${cellIdx}`)
            : null;
      if (isModuleConfigLike(viaActions)) return viaActions;
    } catch (_e) {
      // Canonical surface missing/failed: keep canvas resilient by treating as no-op.
    }

    return null;
  };

  return {
    __activeModuleKey,
    __activeStack,
    __isBottomStack,
    __ensureConfigRefForKey,
    __patchConfigForKey,
    __getActiveConfigRef,
    __ensureCornerCellConfigRef,
  };
}
