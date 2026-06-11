import type { AppContainer, ActionMetaLike } from '../../../types';

import { setCfgColorSwatchesOrder, setCfgSavedColors } from '../runtime/cfg_access.js';
import type { MapsApiShared } from './maps_api_shared.js';
import {
  cloneArrayOrEmpty,
  normalizeColorSwatchesOrderSurfaceList,
  normalizeSavedColorsSurfaceList,
} from './maps_api_shared.js';

export function installMapsApiSavedColors(App: AppContainer, shared: MapsApiShared): void {
  const {
    maps,
    metaNorm,
    safeCfg,
    shouldSkipStorageWrite,
    writeStorageJson,
    getSavedColorsStorageKey,
    reportNonFatal,
  } = shared;

  maps.getSavedColors = function getSavedColors() {
    return normalizeSavedColorsSurfaceList(cloneArrayOrEmpty(safeCfg().savedColors));
  };

  maps.getColorSwatchesOrder = function getColorSwatchesOrder() {
    return normalizeColorSwatchesOrderSurfaceList(cloneArrayOrEmpty(safeCfg().colorSwatchesOrder));
  };

  maps.setColorSwatchesOrder = function setColorSwatchesOrder(arr, meta?: ActionMetaLike) {
    meta = metaNorm(meta, 'maps:setColorSwatchesOrder');
    arr = normalizeColorSwatchesOrderSurfaceList(arr);
    try {
      const out = setCfgColorSwatchesOrder(App, arr, meta);
      if (!shouldSkipStorageWrite(meta)) {
        const keyColors = getSavedColorsStorageKey();
        writeStorageJson(`${keyColors}:order`, arr, 'maps.setColorSwatchesOrder.writeStorage');
      }
      return out;
    } catch (_e) {
      reportNonFatal('maps.setColorSwatchesOrder.cfgSetScalar', _e, 6000);
      return undefined;
    }
  };

  maps.setSavedColors = function setSavedColors(arr, meta?: ActionMetaLike) {
    meta = metaNorm(meta, 'maps:setSavedColors');
    arr = normalizeSavedColorsSurfaceList(arr);
    try {
      const out = setCfgSavedColors(App, arr, meta);
      if (!shouldSkipStorageWrite(meta)) {
        writeStorageJson(getSavedColorsStorageKey(), arr, 'maps.setSavedColors.writeStorage');
      }
      return out;
    } catch (_e1) {
      reportNonFatal('maps.setSavedColors.cfgSetScalar', _e1, 6000);
      return undefined;
    }
  };
}
