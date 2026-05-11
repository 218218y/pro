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

function assertStorageWriteOk(ok: boolean, key: string): void {
  if (ok) return;
  throw new Error(`Cloud Sync storage write failed for ${key}`);
}

function writeRemoteCollectionsToStorage(
  storage: StorageLike,
  keyModels: string,
  keyColors: string,
  keyColorOrder: string,
  keyPresetOrder: string,
  keyHiddenPresets: string,
  models: ReturnType<typeof normalizeModelList>,
  colors: ReturnType<typeof normalizeSavedColorsList>,
  hasColorOrder: boolean,
  colorOrder: ReturnType<typeof readPayloadList> | null,
  presetOrder: ReturnType<typeof readPayloadList>,
  hiddenPresets: ReturnType<typeof readPayloadList>
): void {
  if (typeof storage.setString === 'function') {
    assertStorageWriteOk(storage.setString(keyModels, JSON.stringify(models)), keyModels);
    assertStorageWriteOk(storage.setString(keyColors, JSON.stringify(colors)), keyColors);
    if (hasColorOrder) {
      assertStorageWriteOk(storage.setString(keyColorOrder, JSON.stringify(colorOrder || [])), keyColorOrder);
    }
    assertStorageWriteOk(storage.setString(keyPresetOrder, JSON.stringify(presetOrder)), keyPresetOrder);
    assertStorageWriteOk(
      storage.setString(keyHiddenPresets, JSON.stringify(hiddenPresets)),
      keyHiddenPresets
    );
    return;
  }
  if (typeof storage.setJSON === 'function') {
    assertStorageWriteOk(storage.setJSON(keyModels, models), keyModels);
    assertStorageWriteOk(storage.setJSON(keyColors, colors), keyColors);
    if (hasColorOrder) {
      assertStorageWriteOk(storage.setJSON(keyColorOrder, colorOrder || []), keyColorOrder);
    }
    assertStorageWriteOk(storage.setJSON(keyPresetOrder, presetOrder), keyPresetOrder);
    assertStorageWriteOk(storage.setJSON(keyHiddenPresets, hiddenPresets), keyHiddenPresets);
  }
}

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
): void {
  const models = normalizeModelList(payload?.savedModels);
  const colors = normalizeSavedColorsList(payload?.savedColors);
  const hasColorOrder = hasPayloadKey(payload, 'colorSwatchesOrder');
  const colorOrder = hasColorOrder ? readPayloadList(payload, 'colorSwatchesOrder') : null;
  const presetOrder = readPayloadList(payload, 'presetOrder');
  const hiddenPresets = readPayloadList(payload, 'hiddenPresets');

  suppress.v = true;
  try {
    writeRemoteCollectionsToStorage(
      storage,
      keyModels,
      keyColors,
      keyColorOrder,
      keyPresetOrder,
      keyHiddenPresets,
      models,
      colors,
      hasColorOrder,
      colorOrder,
      presetOrder,
      hiddenPresets
    );
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'applyRemote.writeStorage', e, { throttleMs: 6000 });
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
}
