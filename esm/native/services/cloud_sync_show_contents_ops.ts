import type {
  ActionMetaLike,
  AppContainer,
  CloudSyncContentsTogglePayload,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
  CloudSyncSyncPinCommandResult,
  RootStateLike,
} from '../../../types';

import { patchUi } from '../runtime/ui_write_access.js';
import { getStoreSelectorSubscriber, readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { beginCloudSyncOwnedAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';
import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import {
  publishCloudSyncWriteActivity,
  resolveCloudSyncSettledRowAfterWrite,
} from './cloud_sync_remote_write_support.js';
import { readCloudSyncErrorMessage, _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import {
  parseContentsTogglePayload,
  readShowContentsSyncedLocal,
  resolveShowContentsSyncRoom,
  type CloudSyncSketchConfig,
  type GetCloudSyncRow,
  type StorageLike,
  type UpsertCloudSyncRow,
  writeShowContentsSyncedLocal,
} from './cloud_sync_sketch_ops_shared.js';
import type { CloudSyncAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';

export type CreateCloudSyncShowContentsOpsDeps = {
  App: AppContainer;
  cfg: CloudSyncSketchConfig;
  storage: StorageLike;
  getGateBaseRoom?: () => string;
  restUrl: string;
  clientId: string;
  getRow: GetCloudSyncRow;
  upsertRow: UpsertCloudSyncRow;
  emitRealtimeHint: CloudSyncRealtimeHintSender;
  runtimeStatus?: CloudSyncRuntimeStatus;
  publishStatus?: () => void;
  diag?: CloudSyncDiagFn;
};

export type CloudSyncShowContentsOps = {
  pushShowContentsSyncedNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  pullShowContentsSyncedOnce: (isInitial: boolean) => Promise<void>;
  dispose: () => void;
};

type ShowContentsPushKey = 'enabled' | 'disabled';

type ShowContentsMutableState = {
  lastUpdatedAt: string;
  queuedEnabled: boolean | null;
  queueRunning: boolean;
  disposed: boolean;
  unsubscribeStore: (() => void) | null;
};

const showContentsPushFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncSyncPinCommandResult, ShowContentsPushKey>
>();

function readCurrentShowContents(App: AppContainer): boolean {
  const state = readStoreStateMaybe<RootStateLike>(App);
  return !!state?.ui?.showContents;
}

function isCloudSyncShowContentsMeta(actionMeta: unknown): boolean {
  const source =
    actionMeta && typeof actionMeta === 'object' && 'source' in actionMeta
      ? String((actionMeta as ActionMetaLike).source || '')
      : '';
  return source.indexOf('cloudSync:showContents') === 0;
}

function applyShowContentsStateToUi(
  deps: Pick<CreateCloudSyncShowContentsOpsDeps, 'App' | 'storage'>,
  enabled: boolean,
  source: string
): void {
  const { App, storage } = deps;
  const next = !!enabled;
  writeShowContentsSyncedLocal({ App, storage }, next);
  patchUi(
    App,
    {
      showContents: next,
      showHanger: next ? false : true,
    },
    {
      source,
      immediate: true,
      noAutosave: true,
      noPersist: true,
      noHistory: true,
      noCapture: true,
    }
  );
}

function createPushShowContentsNow(
  deps: CreateCloudSyncShowContentsOpsDeps,
  state: ShowContentsMutableState
): (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult> {
  const {
    App,
    cfg,
    storage,
    getGateBaseRoom,
    restUrl,
    clientId,
    getRow,
    upsertRow,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
  } = deps;

  return (enabled: boolean): Promise<CloudSyncSyncPinCommandResult> => {
    const key: ShowContentsPushKey = enabled ? 'enabled' : 'disabled';
    const flight = beginCloudSyncOwnedAsyncFamilyFlight({
      owner: App as object,
      flights: showContentsPushFlights,
      key,
      run: async () => {
        const roomNow = resolveShowContentsSyncRoom({
          App,
          cfg,
          storage,
          getGateBaseRoom,
          currentRoom: () => '',
        });
        if (!roomNow) return { ok: false, reason: 'room' } satisfies CloudSyncSyncPinCommandResult;

        try {
          const payload: CloudSyncContentsTogglePayload = {
            showContentsEnabled: !!enabled,
            showContentsRev: Date.now(),
            showContentsBy: clientId,
          };

          const res = await upsertRow(restUrl, cfg.anonKey, roomNow, payload, {
            returnRepresentation: true,
          });
          if (!res.ok) return { ok: false, reason: 'write' } satisfies CloudSyncSyncPinCommandResult;

          publishCloudSyncWriteActivity({
            runtimeStatus,
            publishStatus,
            emitRealtimeHint,
            hintScope: 'floatingSync',
            rowName: roomNow,
          });

          await resolveCloudSyncSettledRowAfterWrite({
            returnedRow: res.row,
            reader: { restUrl, anonKey: cfg.anonKey, room: roomNow, getRow },
            runtimeStatus,
            publishStatus,
            onSettledUpdatedAt: value => {
              state.lastUpdatedAt = value;
            },
          });

          return { ok: true, changed: true, enabled: !!enabled } satisfies CloudSyncSyncPinCommandResult;
        } catch (e) {
          _cloudSyncReportNonFatal(App, 'showContentsSync.push', e, { throttleMs: 4000 });
          return {
            ok: false,
            reason: 'error',
            message: readCloudSyncErrorMessage(e),
          } satisfies CloudSyncSyncPinCommandResult;
        }
      },
    });
    if (flight.status === 'reused') return flight.promise;
    if (flight.status === 'busy') {
      return Promise.resolve({ ok: false, reason: 'busy' } satisfies CloudSyncSyncPinCommandResult);
    }
    return flight.promise;
  };
}

function queueShowContentsPush(
  deps: CreateCloudSyncShowContentsOpsDeps,
  state: ShowContentsMutableState,
  pushNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>,
  enabled: boolean
): void {
  state.queuedEnabled = !!enabled;
  if (state.queueRunning || state.disposed) return;

  state.queueRunning = true;
  void Promise.resolve()
    .then(async () => {
      while (!state.disposed && state.queuedEnabled !== null) {
        const target = !!state.queuedEnabled;
        state.queuedEnabled = null;
        const result = await pushNow(target);
        if (!result.ok) {
          deps.diag?.('showContentsSync.push.failed', {
            reason: 'reason' in result ? result.reason : 'error',
            enabled: target,
          });
        }
      }
    })
    .catch(err => {
      _cloudSyncReportNonFatal(deps.App, 'showContentsSync.queue', err, { throttleMs: 4000 });
    })
    .finally(() => {
      state.queueRunning = false;
      if (!state.disposed && state.queuedEnabled !== null) {
        queueShowContentsPush(deps, state, pushNow, state.queuedEnabled);
      }
    });
}

function bindShowContentsStoreSync(
  deps: CreateCloudSyncShowContentsOpsDeps,
  state: ShowContentsMutableState,
  pushNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>
): (() => void) | null {
  const subscribeSelector = getStoreSelectorSubscriber<RootStateLike>(deps.App);
  if (!subscribeSelector) return null;

  return subscribeSelector(
    st => !!st.ui?.showContents,
    (enabled, previous, actionMeta) => {
      if (enabled === previous) return;
      writeShowContentsSyncedLocal({ App: deps.App, storage: deps.storage }, !!enabled);
      if (isCloudSyncShowContentsMeta(actionMeta)) return;
      queueShowContentsPush(deps, state, pushNow, !!enabled);
    },
    { fireImmediately: false, slice: 'ui' }
  );
}

function createPullShowContentsOnce(
  deps: CreateCloudSyncShowContentsOpsDeps,
  state: ShowContentsMutableState
): (isInitial: boolean) => Promise<void> {
  const { App, cfg, storage, getGateBaseRoom, restUrl, getRow, runtimeStatus, publishStatus } = deps;

  return async (isInitial: boolean): Promise<void> => {
    const roomNow = resolveShowContentsSyncRoom({
      App,
      cfg,
      storage,
      getGateBaseRoom,
      currentRoom: () => '',
    });
    if (!roomNow) return;

    const row = await readCloudSyncRowWithPullActivity({
      restUrl,
      anonKey: cfg.anonKey,
      room: roomNow,
      getRow,
      runtimeStatus,
      publishStatus,
    });

    if (!row || !row.updated_at) {
      if (isInitial) {
        const local = readShowContentsSyncedLocal({ App, storage });
        if (local.hasValue && local.enabled !== readCurrentShowContents(App)) {
          applyShowContentsStateToUi({ App, storage }, local.enabled, 'cloudSync:showContents.local');
        }
      }
      return;
    }

    if (isInitial || !state.lastUpdatedAt || row.updated_at !== state.lastUpdatedAt) {
      state.lastUpdatedAt = row.updated_at;
      const parsed = parseContentsTogglePayload(row.payload);
      if (parsed.enabled !== readCurrentShowContents(App)) {
        applyShowContentsStateToUi({ App, storage }, parsed.enabled, 'cloudSync:showContents.remote');
      } else {
        writeShowContentsSyncedLocal({ App, storage }, parsed.enabled);
      }
    }
  };
}

export function createCloudSyncShowContentsOps(
  deps: CreateCloudSyncShowContentsOpsDeps
): CloudSyncShowContentsOps {
  const state: ShowContentsMutableState = {
    lastUpdatedAt: '',
    queuedEnabled: null,
    queueRunning: false,
    disposed: false,
    unsubscribeStore: null,
  };

  const pushShowContentsSyncedNow = createPushShowContentsNow(deps, state);
  const pullShowContentsSyncedOnce = createPullShowContentsOnce(deps, state);
  state.unsubscribeStore = bindShowContentsStoreSync(deps, state, pushShowContentsSyncedNow);

  return {
    pushShowContentsSyncedNow,
    pullShowContentsSyncedOnce,
    dispose: () => {
      state.disposed = true;
      state.queuedEnabled = null;
      if (state.unsubscribeStore) {
        try {
          state.unsubscribeStore();
        } catch (e) {
          _cloudSyncReportNonFatal(deps.App, 'showContentsSync.unsubscribe', e, { throttleMs: 4000 });
        }
      }
      state.unsubscribeStore = null;
    },
  };
}
