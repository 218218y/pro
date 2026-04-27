import { getCfg } from './store_access.js';
import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { cfgPatchWithReplaceKeys } from '../runtime/cfg_access.js';
import { metaRestore } from '../runtime/meta_profiles_access.js';
import { snapshotStoreValueEqual } from './kernel_snapshot_store_shared.js';
import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';
import type { KernelStateKernelConfigMapsTools } from './kernel_state_kernel_config_maps_shared.js';

export function installKernelStateKernelConfigApplySurface(
  helpers: KernelStateKernelConfigHelpers,
  tools: KernelStateKernelConfigMapsTools
): void {
  const { App, __sk, asMeta, asRecord } = helpers;

  __sk.applyConfig = function (cfgIn: unknown, metaIn: unknown) {
    const prevWriting = !!(__sk && __sk.__writing);
    if (__sk) __sk.__writing = true;

    try {
      const cfg = asRecord(cfgIn, {});
      const meta = asMeta(metaIn);
      const useLight = Boolean(meta.noHistory) && Boolean(meta.noAutosave);
      const currentCfg = helpers.readStoreConfigSnapshot();
      const comparableCfgSnapshot = tools.buildComparableCfgSnapshot(currentCfg, cfg);
      const patch: UnknownRecord = {};
      const rep: Record<string, boolean> = {};

      function setValue(key: string, val: unknown, markReplace = true) {
        const nextValue = tools.normalizeComparableConfigEntry(key, val, useLight, comparableCfgSnapshot);
        const prevValue = tools.normalizeComparableConfigEntry(
          key,
          currentCfg[key],
          useLight,
          comparableCfgSnapshot
        );
        if (snapshotStoreValueEqual(prevValue, nextValue)) return;
        patch[key] = nextValue;
        if (markReplace) rep[key] = true;
      }

      function setBool(key: string, val: unknown) {
        setValue(key, !!val);
      }

      function setStr(key: string, val: unknown, allowNull: boolean) {
        setValue(
          key,
          allowNull && (val === null || val === undefined) ? null : val == null ? '' : String(val)
        );
      }

      if (cfg.modulesConfiguration !== undefined) setValue('modulesConfiguration', cfg.modulesConfiguration);
      if (cfg['stackSplitLowerModulesConfiguration'] !== undefined)
        setValue('stackSplitLowerModulesConfiguration', cfg['stackSplitLowerModulesConfiguration']);
      if (cfg.cornerConfiguration !== undefined) setValue('cornerConfiguration', cfg.cornerConfiguration);
      if (cfg.groovesMap !== undefined) setValue('groovesMap', cfg.groovesMap);
      if (cfg.grooveLinesCountMap !== undefined) setValue('grooveLinesCountMap', cfg.grooveLinesCountMap);
      if (cfg.splitDoorsMap !== undefined) setValue('splitDoorsMap', cfg.splitDoorsMap);
      if (cfg.splitDoorsBottomMap !== undefined) setValue('splitDoorsBottomMap', cfg.splitDoorsBottomMap);
      if (cfg.removedDoorsMap !== undefined) setValue('removedDoorsMap', cfg.removedDoorsMap);
      if (cfg.drawerDividersMap !== undefined) setValue('drawerDividersMap', cfg.drawerDividersMap);
      if (cfg.individualColors !== undefined) setValue('individualColors', cfg.individualColors);
      if (cfg.doorSpecialMap !== undefined) setValue('doorSpecialMap', cfg.doorSpecialMap);
      if (cfg.doorStyleMap !== undefined) setValue('doorStyleMap', cfg.doorStyleMap);
      if (cfg.mirrorLayoutMap !== undefined) setValue('mirrorLayoutMap', cfg.mirrorLayoutMap);
      if (cfg.handlesMap !== undefined) setValue('handlesMap', cfg.handlesMap);
      if (cfg.hingeMap !== undefined) setValue('hingeMap', cfg.hingeMap);
      if (cfg.curtainMap !== undefined) setValue('curtainMap', cfg.curtainMap);
      if (cfg.doorTrimMap !== undefined) setValue('doorTrimMap', cfg.doorTrimMap);
      if (cfg.savedColors !== undefined) setValue('savedColors', cfg.savedColors);
      if (cfg.colorSwatchesOrder !== undefined) setValue('colorSwatchesOrder', cfg.colorSwatchesOrder);
      if (cfg.savedNotes !== undefined) setValue('savedNotes', cfg.savedNotes);
      if (cfg.preChestState !== undefined) setValue('preChestState', cfg.preChestState);
      if (cfg.isLibraryMode !== undefined) setBool('isLibraryMode', cfg.isLibraryMode);
      if (cfg.wardrobeType !== undefined) setStr('wardrobeType', cfg.wardrobeType, false);
      if (cfg.boardMaterial !== undefined) setStr('boardMaterial', cfg.boardMaterial, false);
      if (cfg.globalHandleType !== undefined) setStr('globalHandleType', cfg.globalHandleType, false);
      if (cfg.isMultiColorMode !== undefined) setBool('isMultiColorMode', cfg.isMultiColorMode);
      if (cfg.showDimensions !== undefined) setBool('showDimensions', cfg.showDimensions);
      if (cfg.isManualWidth !== undefined) setBool('isManualWidth', cfg.isManualWidth);
      if (cfg.customUploadedDataURL !== undefined)
        setStr('customUploadedDataURL', cfg.customUploadedDataURL, true);
      if (cfg.grooveLinesCount !== undefined) {
        const grooveLinesCount = Number(cfg.grooveLinesCount);
        setValue(
          'grooveLinesCount',
          cfg.grooveLinesCount == null
            ? null
            : Number.isFinite(grooveLinesCount)
              ? Math.max(1, Math.floor(grooveLinesCount))
              : null,
          false
        );
      }

      if (Object.keys(patch).length) {
        const patchFixed = cfgPatchWithReplaceKeys(patch, rep);
        const base: ActionMetaLike = Object.assign({}, meta, {
          source: meta.source != null ? String(meta.source) : 'kernel.applyConfig',
        });
        const metaFixed = metaRestore(App, base, 'kernel.applyConfig');
        helpers.setStoreConfigPatch(App, patchFixed, metaFixed);
        return true;
      }

      return false;
    } finally {
      if (__sk && !prevWriting) __sk.__writing = false;
    }
  };

  __sk.getStoreConfig = function () {
    return asRecord(getCfg(App), {});
  };
}
