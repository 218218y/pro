import type { CloudSyncSketchCommandResult, CloudSyncSketchPayload } from '../../../types';

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
  readCloudSyncErrorMessage,
  readCloudSyncJsonField,
} from './cloud_sync_support.js';

export function createCloudSyncSketchSyncNow(
  deps: CreateCloudSyncSketchRoomOpsDeps,
  state: CloudSyncSketchRoomMutableState
): () => Promise<CloudSyncSketchCommandResult> {
  const {
    App,
    cfg,
    storage,
    getGateBaseRoom,
    restUrl,
    clientId,
    currentRoom,
    getRow,
    upsertRow,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
  } = deps;

  return async (): Promise<CloudSyncSketchCommandResult> => {
    try {
      const sketchRoom = resolveCloudSyncSketchRoom(
        { App, cfg, storage, getGateBaseRoom, currentRoom },
        'push'
      );
      if (!sketchRoom) return { ok: false, reason: 'room' };

      const snap = captureSketchSnapshot(App);
      if (!snap) return { ok: false, reason: 'capture' };

      const existing = await readCloudSyncRowWithPullActivity({
        restUrl,
        anonKey: cfg.anonKey,
        room: sketchRoom,
        getRow,
        runtimeStatus,
        publishStatus,
      });
      const existingPayload = existing ? parseSketchPayload(existing.payload) : null;
      if (existingPayload && existingPayload.hash && existingPayload.hash === snap.hash) {
        return { ok: true, changed: false, reason: 'noop', hash: snap.hash };
      }

      const payload: CloudSyncSketchPayload = {
        sketch: readCloudSyncJsonField(snap.data),
        sketchHash: snap.hash,
        sketchRev: Date.now(),
        sketchBy: clientId,
      };

      const res = await upsertRow(restUrl, cfg.anonKey, sketchRoom, payload, { returnRepresentation: true });
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
        reader: { restUrl, anonKey: cfg.anonKey, room: sketchRoom, getRow },
        runtimeStatus,
        publishStatus,
        onSettledUpdatedAt: value => {
          state.lastSketchPullUpdatedAt = value;
        },
      });

      state.sketchBaselineDone = true;

      return { ok: true, changed: true, hash: snap.hash };
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.push', e, { throttleMs: 4000 });
      return { ok: false, reason: 'error', message: readCloudSyncErrorMessage(e) };
    }
  };
}
