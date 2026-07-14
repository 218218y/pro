import type { ActionMetaLike, AppContainer, CloudSyncPayload } from '../../../types';

import { ensureModelsLoadedViaService } from '../runtime/models_access.js';
import { writeSavedColors, writeColorSwatchesOrder } from '../runtime/maps_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import {
  hasPayloadKey,
  normalizeModelList,
  normalizeSavedColorsList,
  readPayloadList,
} from './cloud_sync_support_shared.js';
import type { StorageLike } from './cloud_sync_support_storage_shared.js';
import { createCloudCollectionsRepository } from './cloud_sync_collections_repository.js';

export function applyRemote(
  App: AppContainer,
  storage: StorageLike,
  keyModels: string,
  keyColors: string,
  keyColorOrder: string,
  keyPresetOrder: string,
  keyHiddenPresets: string,
  payload: CloudSyncPayload,
  suppress: { v: boolean }
): boolean {
  const models = normalizeModelList(payload?.savedModels);
  const colors = normalizeSavedColorsList(payload?.savedColors);
  const hasColorOrder = hasPayloadKey(payload, 'colorSwatchesOrder');
  const colorOrder = hasColorOrder ? readPayloadList(payload, 'colorSwatchesOrder') : null;
  const presetOrder = readPayloadList(payload, 'presetOrder');
  const hiddenPresets = readPayloadList(payload, 'hiddenPresets');
  const repository = createCloudCollectionsRepository({
    storage,
    keys: {
      models: keyModels,
      colors: keyColors,
      colorOrder: keyColorOrder,
      presetOrder: keyPresetOrder,
      hiddenPresets: keyHiddenPresets,
    },
  });

  suppress.v = true;
  try {
    const current = repository.read();
    const commitResult = repository.commit({
      m: models,
      c: colors,
      o: hasColorOrder ? colorOrder || [] : current.o,
      p: presetOrder,
      h: hiddenPresets,
    });
    if (commitResult.mirrorFailures.length) {
      _cloudSyncReportNonFatal(
        App,
        'applyRemote.mirrorPerKeyStorage',
        new Error(`Cloud collections per-key mirror failed for ${commitResult.mirrorFailures.join(', ')}`),
        { throttleMs: 6000 }
      );
    }
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'applyRemote.commitCollections', e, { throttleMs: 6000 });
    return false;
  } finally {
    suppress.v = false;
  }

  try {
    ensureModelsLoadedViaService(App, { forceRebuild: true, silent: false });
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'applyRemote.refreshModelsUi', e, { throttleMs: 6000 });
  }

  try {
    const mapsMeta: ActionMetaLike = { source: 'cloudSync.pull', noStorageWrite: true };
    writeSavedColors(App, colors, mapsMeta);
    if (hasColorOrder) writeColorSwatchesOrder(App, colorOrder || [], mapsMeta);
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'applyRemote.refreshColorsUi', e, { throttleMs: 6000 });
  }
  return true;
}
