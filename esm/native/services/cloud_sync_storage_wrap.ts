// Cloud Sync storage wrapper helpers.
// Isolates storage monkey-patching from the owner so the install flow stays readable.

import type { AppContainer } from '../../../types';

import type { StorageLike } from './cloud_sync_owner_context.js';
import {
  _cloudSyncReportNonFatal,
  restoreWrappedStorageFns,
  rememberWrappedStorageFns,
} from './cloud_sync_support.js';

type CreateCloudSyncStorageWrapArgs = {
  App: AppContainer;
  storage: StorageLike;
  keysToSync: string[];
  suppressRef: { v: boolean };
  schedulePush: () => void;
};

export function createCloudSyncStorageWrap(args: CreateCloudSyncStorageWrapArgs): { dispose: () => void } {
  try {
    const keysToSync = new Set(args.keysToSync.map(key => String(key)));

    try {
      restoreWrappedStorageFns(args.storage);
    } catch (err) {
      _cloudSyncReportNonFatal(args.App, 'cloudSyncStorageWrap.restorePrev', err, { throttleMs: 8000 });
    }

    rememberWrappedStorageFns(args.storage);

    const origSetStringProp = args.storage.setString;
    const origSetJSONProp = args.storage.setJSON;
    const origRemoveProp = args.storage.remove;

    const origSetString =
      typeof origSetStringProp === 'function' ? origSetStringProp.bind(args.storage) : null;
    const origSetJSON = typeof origSetJSONProp === 'function' ? origSetJSONProp.bind(args.storage) : null;
    const origRemove = typeof origRemoveProp === 'function' ? origRemoveProp.bind(args.storage) : null;

    if (origSetString) {
      args.storage.setString = (k: unknown, v: unknown): boolean => {
        const ok = origSetString(k, v);
        try {
          const kk = String(k);
          if (!args.suppressRef.v && keysToSync.has(kk)) args.schedulePush();
        } catch (err) {
          _cloudSyncReportNonFatal(args.App, 'cloudSyncStorageWrap.setString', err, { throttleMs: 8000 });
        }
        return ok;
      };
    }

    if (origSetJSON) {
      args.storage.setJSON = (k: unknown, v: unknown): boolean => {
        const ok = origSetJSON(k, v);
        try {
          const kk = String(k);
          if (!args.suppressRef.v && keysToSync.has(kk)) args.schedulePush();
        } catch (err) {
          _cloudSyncReportNonFatal(args.App, 'cloudSyncStorageWrap.setJSON', err, { throttleMs: 8000 });
        }
        return ok;
      };
    }

    if (origRemove) {
      args.storage.remove = (k: unknown): boolean => {
        const ok = origRemove(k);
        try {
          const kk = String(k);
          if (!args.suppressRef.v && keysToSync.has(kk)) args.schedulePush();
        } catch (err) {
          _cloudSyncReportNonFatal(args.App, 'cloudSyncStorageWrap.remove', err, { throttleMs: 8000 });
        }
        return ok;
      };
    }
  } catch (err) {
    _cloudSyncReportNonFatal(args.App, 'cloudSyncStorageWrap.install', err, { throttleMs: 8000 });
  }

  return {
    dispose: (): void => {
      try {
        restoreWrappedStorageFns(args.storage);
      } catch (err) {
        _cloudSyncReportNonFatal(args.App, 'cloudSyncStorageWrap.dispose', err, { throttleMs: 8000 });
      }
    },
  };
}
