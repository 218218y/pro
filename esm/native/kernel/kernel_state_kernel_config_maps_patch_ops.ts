import type { UnknownRecord } from '../../../types';

import type { KernelStateKernelConfigHelpers } from './kernel_state_kernel_config_shared.js';
import type { KernelStateKernelConfigMapsTools } from './kernel_state_kernel_config_maps_shared.js';
import {
  commitKernelStateKernelConfigPatch,
  mergeKernelStateKernelConfigBatchMeta,
  readKernelConfigPatchForce,
  readKernelConfigPatchSource,
  requestKernelStateKernelConfigBuild,
  scheduleKernelStateKernelConfigAutosave,
} from './kernel_state_kernel_config_maps_patch_shared.js';

export function installKernelStateKernelConfigPatchSurfaceRuntime(
  helpers: KernelStateKernelConfigHelpers,
  tools: KernelStateKernelConfigMapsTools
): void {
  const { App, __sk, asMeta, asRecord, isFn } = helpers;

  __sk.patchConfigMaps = function (nextMapsIn: unknown, metaIn: unknown) {
    const nextMaps = asRecord(nextMapsIn, {});
    const meta = asMeta(metaIn);
    const source = readKernelConfigPatchSource(meta, 'config');
    const force = readKernelConfigPatchForce(meta);
    const sc0 = helpers.readStoreConfigSnapshot();
    const useLight = Boolean(meta.noHistory) && Boolean(meta.noAutosave);
    const normalizedPatch = tools.normalizePatchConfigEntries(nextMaps, sc0, useLight);

    const didWrite =
      __sk && typeof __sk.applyConfig === 'function' ? !!__sk.applyConfig(normalizedPatch, meta) : false;

    const batch = __sk && __sk.__cfgBatch ? __sk.__cfgBatch : null;
    if (!didWrite) {
      if (!force) return;
      if (mergeKernelStateKernelConfigBatchMeta(batch, source, meta, true)) return;
      if (!meta.noBuild || force) {
        requestKernelStateKernelConfigBuild(App, meta, source, force);
      }
      return;
    }
    if (batch && mergeKernelStateKernelConfigBatchMeta(batch, source, meta, force)) {
      batch.dirty = true;
      return;
    }

    commitKernelStateKernelConfigPatch(__sk, source, meta, force);

    if (!meta.noBuild || force) {
      requestKernelStateKernelConfigBuild(App, meta, source, force);
    }
    scheduleKernelStateKernelConfigAutosave(App, meta);
  };

  __sk.patchConfigEntry = function (mapNameIn: unknown, keyIn: unknown, valueOrFn: unknown, metaIn: unknown) {
    const mapName = String(mapNameIn || '');
    const key = String(keyIn || '');
    if (!mapName || !key) return;

    const meta = asMeta(metaIn);
    const useLight = Boolean(meta.noHistory) && Boolean(meta.noAutosave);
    const cfgRec = helpers.readStoreConfigSnapshot();
    const curMap = helpers.isRecord(cfgRec[mapName]) ? cfgRec[mapName] : {};
    const nextMap: UnknownRecord = Object.assign({}, asRecord(curMap, {}));
    const prevVal = nextMap[key];
    const nextVal = isFn(valueOrFn) ? valueOrFn(prevVal, nextMap) : valueOrFn;

    if (nextVal === undefined || nextVal === null) delete nextMap[key];
    else nextMap[key] = nextVal;

    const normalizedPatch = tools.normalizePatchConfigEntries({ [mapName]: nextMap }, cfgRec, useLight);
    const normalizedMap = asRecord(normalizedPatch[mapName], {});
    const source = readKernelConfigPatchSource(meta, `${mapName}:${key}`);
    if (__sk && typeof __sk.patchConfigMaps === 'function') {
      __sk.patchConfigMaps(normalizedPatch, Object.assign({ source }, meta));
    }
    return Object.prototype.hasOwnProperty.call(normalizedMap, key) ? normalizedMap[key] : undefined;
  };

  __sk.patchConfigScalar = function (nameIn: unknown, valueOrFn: unknown, metaIn: unknown) {
    const name = String(nameIn || '');
    if (!name) return;

    if (name === 'hasUnsavedChanges') {
      const meta = asMeta(metaIn);
      const prev = __sk && typeof __sk.isDirty === 'function' ? __sk.isDirty() : false;
      const next = isFn(valueOrFn) ? Boolean(valueOrFn(prev, {})) : Boolean(valueOrFn);
      if (__sk && typeof __sk.setDirty === 'function') {
        const source = readKernelConfigPatchSource(meta, 'dirtyFlag');
        __sk.setDirty(next, Object.assign({ source }, meta));
      }
      return next;
    }

    const meta = asMeta(metaIn);
    const useLight = Boolean(meta.noHistory) && Boolean(meta.noAutosave);
    const baseCfg: UnknownRecord = helpers.readStoreConfigSnapshot();
    const prevVal = baseCfg[name];
    const nextValRaw = isFn(valueOrFn) ? valueOrFn(prevVal, baseCfg) : valueOrFn;
    const normalizedPatch = tools.normalizePatchConfigEntries({ [name]: nextValRaw }, baseCfg, useLight);
    const nextVal = normalizedPatch[name];

    if (__sk && typeof __sk.patchConfigMaps === 'function') {
      const source = readKernelConfigPatchSource(meta, `config:${name}`);
      __sk.patchConfigMaps(normalizedPatch, Object.assign({ source }, meta));
    }

    return nextVal;
  };
}
