import type {
  CloudSyncPanelApiDeps,
  CloudSyncPanelSnapshot,
  CloudSyncRoomStatusSnapshot,
  CloudSyncSite2TabsGateSnapshot,
} from '../../../types';

import { describeCloudSyncRoomStatus } from './cloud_sync_room_commands.js';
import { buildCloudSyncPanelApiOp } from './cloud_sync_panel_api_support.js';
import { cloneCloudSyncSite2TabsGateSnapshot } from './cloud_sync_tabs_gate_support.js';

function cloneCloudSyncRoomStatusSnapshot(
  snapshot: CloudSyncRoomStatusSnapshot
): CloudSyncRoomStatusSnapshot {
  return {
    room: snapshot.room,
    isPublic: snapshot.isPublic,
    status: snapshot.status,
    credentialState: snapshot.credentialState,
    credentialExpiresAt: snapshot.credentialExpiresAt,
    retryAt: snapshot.retryAt,
    failureKind: snapshot.failureKind,
  };
}

function readConflictSnapshot(
  conflict: CloudSyncPanelApiDeps['runtimeStatus']['conflict']
): CloudSyncPanelSnapshot['conflict'] {
  if (!conflict) return undefined;
  return {
    conflictId: String(conflict.conflictId || ''),
    generation: Number(conflict.generation) || 0,
    room: String(conflict.room || ''),
    keys: Array.isArray(conflict.keys) ? conflict.keys.map(key => String(key)) : [],
    remoteRevision: Number(conflict.remoteRevision) || 0,
    detectedAt: Number(conflict.detectedAt) || 0,
    state: conflict.state,
  };
}

function readLocalCloudSyncSite2TabsGateSnapshot(opts: {
  tabsGateOpenRef: { value: unknown };
  tabsGateUntilRef: { value: unknown };
  now: () => number;
}): CloudSyncSite2TabsGateSnapshot {
  const until = Number(opts.tabsGateUntilRef.value) || 0;
  const remainingMs = until - opts.now();
  const open = !!opts.tabsGateOpenRef.value && remainingMs > 0;
  return {
    open,
    until,
    minutesLeft: open ? Math.ceil(remainingMs / 60000) : 0,
  };
}

export interface CloudSyncPanelSnapshotReaders {
  readRoomStatusSnapshot: (roomOverride?: string | null) => CloudSyncRoomStatusSnapshot;
  readPanelSnapshot: (roomOverride?: string | null) => CloudSyncPanelSnapshot;
  readSite2TabsGateSnapshot: () => CloudSyncSite2TabsGateSnapshot;
}

export function createCloudSyncPanelSnapshotReaders(
  deps: CloudSyncPanelApiDeps
): CloudSyncPanelSnapshotReaders {
  const {
    App,
    cfg,
    tabsGateOpenRef,
    tabsGateUntilRef,
    getSite2TabsGateSnapshot,
    now,
    getCurrentRoom,
    getFloatingSketchSyncEnabled,
    runtimeStatus,
    reportNonFatal,
  } = deps;

  const panelApiOp = (name: string): string => buildCloudSyncPanelApiOp(name);
  const readLocalSite2TabsGateSnapshot = (): CloudSyncSite2TabsGateSnapshot =>
    readLocalCloudSyncSite2TabsGateSnapshot({ tabsGateOpenRef, tabsGateUntilRef, now });

  const readRoomStatusSnapshot = (roomOverride?: string | null): CloudSyncRoomStatusSnapshot => {
    try {
      const room = typeof roomOverride === 'string' ? roomOverride : getCurrentRoom();
      return describeCloudSyncRoomStatus(room, cfg.publicRoom, runtimeStatus.credential);
    } catch (__wpErr) {
      reportNonFatal(App, panelApiOp('roomStatusSnapshot'), __wpErr, { throttleMs: 4000 });
      return {
        room: '',
        isPublic: null,
        status: 'סנכרון לא פעיל',
        credentialState: 'missing',
        credentialExpiresAt: '',
        retryAt: 0,
        failureKind: '',
      };
    }
  };

  const readPanelSnapshot = (roomOverride?: string | null): CloudSyncPanelSnapshot => {
    const roomStatus = readRoomStatusSnapshot(roomOverride);
    const conflict = readConflictSnapshot(runtimeStatus?.conflict);
    try {
      return {
        ...cloneCloudSyncRoomStatusSnapshot(roomStatus),
        floatingSync: !!getFloatingSketchSyncEnabled(),
        ...(conflict ? { conflict } : {}),
      };
    } catch (__wpErr) {
      reportNonFatal(App, panelApiOp('panelSnapshot'), __wpErr, { throttleMs: 4000 });
      return {
        ...cloneCloudSyncRoomStatusSnapshot(roomStatus),
        floatingSync: false,
        ...(conflict ? { conflict } : {}),
      };
    }
  };

  const readSite2TabsGateSnapshot = (): CloudSyncSite2TabsGateSnapshot => {
    try {
      return cloneCloudSyncSite2TabsGateSnapshot(getSite2TabsGateSnapshot());
    } catch (__wpErr) {
      reportNonFatal(App, panelApiOp('tabsGateSnapshot'), __wpErr, { throttleMs: 4000 });
      return readLocalSite2TabsGateSnapshot();
    }
  };

  return { readRoomStatusSnapshot, readPanelSnapshot, readSite2TabsGateSnapshot };
}
