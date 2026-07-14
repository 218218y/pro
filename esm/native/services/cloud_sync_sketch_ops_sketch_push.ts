import type {
  CloudSyncSketchCommandResult,
  CloudSyncSketchPayload,
  CloudSyncSketchSyncOptions,
} from '../../../types';

import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import {
  publishCloudSyncWriteActivity,
  resolveCloudSyncSettledRowAfterWrite,
} from './cloud_sync_remote_write_support.js';
import { parseSketchPayload, resolveCloudSyncSketchRoom } from './cloud_sync_sketch_ops_shared.js';
import type {
  CloudSyncSketchRoomMutableState,
  CreateCloudSyncSketchRoomOpsDeps,
} from './cloud_sync_sketch_ops_sketch_state.js';
import {
  _cloudSyncReportNonFatal,
  captureSketchSnapshot,
  isDefaultCloudSketchSnapshot,
  readCloudSyncErrorMessage,
  readCloudSyncJsonField,
} from './cloud_sync_support.js';

type CloudSyncSketchWriteIntent = { kind: 'clear' } | { kind: 'snapshot'; data: unknown; hash: string };

function resolveCloudSyncSketchWriteIntent(
  deps: CreateCloudSyncSketchRoomOpsDeps,
  options?: CloudSyncSketchSyncOptions
): CloudSyncSketchWriteIntent | null {
  if (options?.mode === 'clear') return { kind: 'clear' };
  const snapshot = captureSketchSnapshot(deps.App);
  if (!snapshot) return null;
  if (isDefaultCloudSketchSnapshot(deps.App, snapshot)) return { kind: 'clear' };
  return { kind: 'snapshot', data: snapshot.data, hash: snapshot.hash };
}

function isCloudSketchAlreadyCleared(existingPayload: ReturnType<typeof parseSketchPayload> | null): boolean {
  return !!existingPayload && !existingPayload.hash && !existingPayload.sketch;
}

function buildCloudSketchPayload(
  intent: CloudSyncSketchWriteIntent,
  clientId: string
): CloudSyncSketchPayload {
  return intent.kind === 'clear'
    ? {
        sketch: null,
        sketchHash: null,
        sketchRev: Date.now(),
        sketchBy: clientId,
      }
    : {
        sketch: readCloudSyncJsonField(intent.data),
        sketchHash: intent.hash,
        sketchRev: Date.now(),
        sketchBy: clientId,
      };
}

export function createCloudSyncSketchSyncNow(
  deps: CreateCloudSyncSketchRoomOpsDeps,
  state: CloudSyncSketchRoomMutableState
): (options?: CloudSyncSketchSyncOptions) => Promise<CloudSyncSketchCommandResult> {
  const {
    App,
    cfg,
    storage,
    getGateBaseRoom,
    gatewayUrl,
    clientId,
    currentRoom,
    getRow,
    upsertRow,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
  } = deps;

  return async (options?: CloudSyncSketchSyncOptions): Promise<CloudSyncSketchCommandResult> => {
    try {
      const sketchRoom = resolveCloudSyncSketchRoom(
        { App, cfg, storage, getGateBaseRoom, currentRoom },
        'push'
      );
      if (!sketchRoom) return { ok: false, reason: 'room' };

      const intent = resolveCloudSyncSketchWriteIntent(deps, options);
      if (!intent) return { ok: false, reason: 'capture' };

      const existingResult = await readCloudSyncRowWithPullActivity({
        gatewayUrl,
        anonKey: cfg.anonKey,
        room: sketchRoom,
        getRow,
        runtimeStatus,
        publishStatus,
      });
      if (existingResult.ok === false) {
        return { ok: false, reason: 'write' };
      }
      const existing = existingResult.row;
      const existingPayload = existing ? parseSketchPayload(existing.payload) : null;
      if (intent.kind === 'clear') {
        if (isCloudSketchAlreadyCleared(existingPayload)) {
          return { ok: true, changed: false, reason: 'noop', hash: '' };
        }
      } else if (existingPayload?.hash && existingPayload.hash === intent.hash) {
        return { ok: true, changed: false, reason: 'noop', hash: intent.hash };
      }

      const res = await upsertRow(
        gatewayUrl,
        cfg.anonKey,
        sketchRoom,
        buildCloudSketchPayload(intent, clientId)
      );
      if (!res.ok) return { ok: false, reason: 'write' };
      publishCloudSyncWriteActivity({
        runtimeStatus,
        publishStatus,
        emitRealtimeHint,
        hintScope: 'sketch',
        rowName: sketchRoom,
      });

      await resolveCloudSyncSettledRowAfterWrite({
        returnedRow: res.row,
        reader: { gatewayUrl, anonKey: cfg.anonKey, room: sketchRoom, getRow },
        runtimeStatus,
        publishStatus,
        onSettledUpdatedAt: value => {
          state.lastSketchPullUpdatedAt = value;
        },
      });

      state.sketchBaselineDone = true;

      return intent.kind === 'clear'
        ? { ok: true, changed: true, reason: 'cleared', hash: '' }
        : { ok: true, changed: true, hash: intent.hash };
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.push', e, { throttleMs: 4000 });
      return { ok: false, reason: 'error', message: readCloudSyncErrorMessage(e) };
    }
  };
}
