import { calculateModuleStructure } from '../features/modules_configuration/calc_module_structure.js';
import { getNotesForSaveFn, getRestoreNotesFromSaveFn } from '../runtime/notes_access.js';
import {
  getBuilderAddFoldedClothes,
  getBuilderAddHangingClothes,
  getBuilderAddOutlines,
  getBuilderAddRealisticHanger,
  getBuilderBuildChestOnly,
  getBuilderBuildCornerWing,
  getBuilderCreateDoorVisual,
  getBuilderCreateInternalDrawerBox,
  getBuilderGetMaterial,
  getBuilderRenderAdapterService,
  getBuilderRenderOps,
} from '../runtime/builder_service_access.js';
import {
  getPlatformCleanGroup,
  getPlatformPruneCachesSafe,
  getPlatformTriggerRender,
} from '../runtime/platform_access.js';
import { getUiFeedback } from '../runtime/service_access.js';

import type { ThreeLike } from '../../../types/index.js';
import type { BuilderNamespaceBindingMap } from './bootstrap_shared.js';
import { asRecord } from './bootstrap_shared.js';
import { runRebuildDrawerMeta } from './bootstrap_drawer_meta.js';

export function createBuilderNamespaceBindingMap(): BuilderNamespaceBindingMap {
  return {
    util: [
      {
        key: 'cleanGroup',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderCleanGroup',
        bind: context => getPlatformCleanGroup(context.App),
      },
      {
        key: 'pruneCachesSafe',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderPruneCachesSafe',
        bind: context => getPlatformPruneCachesSafe(context.App),
      },
    ],
    materials: [
      {
        key: 'getMaterial',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderGetMaterial',
        bind: context => getBuilderGetMaterial(context.App),
      },
      {
        key: 'addOutlines',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderAddOutlines',
        bind: context => getBuilderAddOutlines(context.App),
      },
    ],
    modules: [
      { key: 'calculateModuleStructure', mode: 'missing', value: calculateModuleStructure },
      {
        key: 'createDoorVisual',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderCreateDoorVisual',
        bind: context => getBuilderCreateDoorVisual(context.App),
      },
      {
        key: 'createInternalDrawerBox',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderCreateInternalDrawerBox',
        bind: context => getBuilderCreateInternalDrawerBox(context.App),
      },
      {
        key: 'buildChestOnly',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderBuildChestOnly',
        bind: context => getBuilderBuildChestOnly(context.App),
      },
      {
        key: 'buildCornerWing',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderBuildCornerWing',
        bind: context => getBuilderBuildCornerWing(context.App),
      },
      {
        key: '__rebuildDrawerMeta',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderRebuildDrawerMeta',
        bind: context => () => runRebuildDrawerMeta(context.App),
      },
    ],
    contents: [
      {
        key: 'addDimensionLine',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderAddDimensionLine',
        bind: context => {
          const renderOps = getBuilderRenderOps(context.App);
          return renderOps && typeof renderOps.addDimensionLine === 'function'
            ? renderOps.addDimensionLine
            : null;
        },
      },
      {
        key: 'addHangingClothes',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderAddHangingClothes',
        bind: context => getBuilderAddHangingClothes(context.App),
      },
      {
        key: 'addFoldedClothes',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderAddFoldedClothes',
        bind: context => getBuilderAddFoldedClothes(context.App),
      },
      {
        key: 'addRealisticHanger',
        mode: 'value',
        value: null,
        stableKey: '__wpBuilderAddRealisticHanger',
        bind: context => getBuilderAddRealisticHanger(context.App),
      },
    ],
    notes: [
      {
        key: 'getNotesForSave',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderGetNotesForSave',
        bind: context => getNotesForSaveFn(context.App),
      },
      {
        key: 'restoreNotesFromSave',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderRestoreNotesFromSave',
        bind: context => getRestoreNotesFromSaveFn(context.App),
      },
    ],
    render: [
      {
        key: 'triggerRender',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderTriggerRender',
        bind: context => getPlatformTriggerRender(context.App),
      },
      {
        key: 'ensureWardrobeGroup',
        mode: 'missing',
        value: null,
        stableKey: '__wpBuilderEnsureWardrobeGroup',
        bind: context => {
          const renderAdapterSvc = asRecord(getBuilderRenderAdapterService(context.App));
          const ensureWardrobeGroup =
            renderAdapterSvc && typeof renderAdapterSvc.ensureWardrobeGroup === 'function'
              ? renderAdapterSvc.ensureWardrobeGroup
              : null;
          return ensureWardrobeGroup ? (THREE: ThreeLike) => ensureWardrobeGroup(THREE) : null;
        },
      },
      {
        key: 'showToast',
        mode: 'missing',
        value: null,
        bind: context => {
          const uiFeedback = getUiFeedback(context.App);
          return typeof uiFeedback.toast === 'function'
            ? uiFeedback.toast
            : typeof uiFeedback.showToast === 'function'
              ? uiFeedback.showToast
              : null;
        },
      },
    ],
  };
}
