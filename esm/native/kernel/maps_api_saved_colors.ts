import type { AppContainer, ActionMetaLike, SavedColorLike } from '../../../types';

import { setCfgColorSwatchesOrder, setCfgSavedColors } from '../runtime/cfg_access.js';
import { updateCloudCollectionsViaServiceOrThrow } from '../runtime/cloud_collections_access.js';
import type { MapsApiShared } from './maps_api_shared.js';
import {
  cloneArrayOrEmpty,
  normalizeColorSwatchesOrderSurfaceList,
  normalizeSavedColorsSurfaceList,
} from './maps_api_shared.js';

export function installMapsApiSavedColors(App: AppContainer, shared: MapsApiShared): void {
  const { maps, metaNorm, safeCfg, shouldSkipStorageWrite, reportNonFatal } = shared;

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
      if (!shouldSkipStorageWrite(meta)) {
        const colorOrder = arr.filter((value): value is string | null => value !== undefined);
        updateCloudCollectionsViaServiceOrThrow(
          App,
          { colorOrder },
          'maps.setColorSwatchesOrder persistence'
        );
      }
      const out = setCfgColorSwatchesOrder(App, arr, meta);
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
      if (!shouldSkipStorageWrite(meta)) {
        const savedColors = arr.filter(
          (value): value is SavedColorLike =>
            !!value && typeof value === 'object' && typeof value.id === 'string'
        );
        updateCloudCollectionsViaServiceOrThrow(App, { savedColors }, 'maps.setSavedColors persistence');
      }
      const out = setCfgSavedColors(App, arr, meta);
      return out;
    } catch (_e1) {
      reportNonFatal('maps.setSavedColors.cfgSetScalar', _e1, 6000);
      return undefined;
    }
  };
}
