import type {
  CloudSyncSketchCommandResult,
  CloudSyncSketchPayload,
  CloudSyncSketchSyncOptions,
} from '../../../types';

import { publishCloudSyncWriteActivity } from './cloud_sync_remote_write_support.js';
import { resolveCloudSyncSketchRoom } from './cloud_sync_sketch_ops_shared.js';
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

      const res = await upsertRow(
        gatewayUrl,
        cfg.anonKey,
        sketchRoom,
        buildCloudSketchPayload(intent, clientId),
        { mode: 'publish-sketch' }
      );
      if (!res.ok) return { ok: false, reason: 'write' };

      state.lastSketchPullUpdatedAt = res.row.updated_at;
      state.sketchBaselineDone = true;

      if (res.changed === false) {
        return intent.kind === 'clear'
          ? { ok: true, changed: false, reason: 'noop', hash: '' }
          : { ok: true, changed: false, reason: 'noop', hash: intent.hash };
      }

      publishCloudSyncWriteActivity({
        runtimeStatus,
        publishStatus,
        emitRealtimeHint,
        hintScope: 'sketch',
        rowName: sketchRoom,
      });

      return intent.kind === 'clear'
        ? { ok: true, changed: true, reason: 'cleared', hash: '' }
        : { ok: true, changed: true, hash: intent.hash };
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.push', e, { throttleMs: 4000 });
      return { ok: false, reason: 'error', message: readCloudSyncErrorMessage(e) };
    }
  };
}
