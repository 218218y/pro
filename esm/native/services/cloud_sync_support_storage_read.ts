import type { AppContainer, CloudSyncLocalCollections } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import {
  buildEmptyCloudSyncLocalCollections,
  readLocalModelList,
  readLocalOrderList,
  readLocalSavedColorsList,
} from './cloud_sync_support_storage_shared.js';
import type { StorageLike } from './cloud_sync_support_storage_shared.js';

export function readLocal(
  storage: StorageLike,
  keyModels: string,
  keyColors: string,
  keyColorOrder: string,
  keyPresetOrder: string,
  keyHiddenPresets: string,
  opts?: { App?: AppContainer | null }
): CloudSyncLocalCollections {
  try {
    return {
      m: readLocalModelList(storage, keyModels),
      c: readLocalSavedColorsList(storage, keyColors),
      o: readLocalOrderList(storage, keyColorOrder),
      p: readLocalOrderList(storage, keyPresetOrder),
      h: readLocalOrderList(storage, keyHiddenPresets),
    };
  } catch (e) {
    _cloudSyncReportNonFatal(opts?.App || null, 'readLocal.storageParse', e, { throttleMs: 8000 });
    return buildEmptyCloudSyncLocalCollections();
  }
}
