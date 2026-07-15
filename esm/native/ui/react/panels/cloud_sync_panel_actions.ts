import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import type {
  CloudSyncConflictResolution,
  CloudSyncPanelSnapshot,
  CloudSyncServiceLike,
} from '../../../../../types';

import { getCloudSyncServiceMaybe } from '../../../services/api.js';
import { createCloudSyncUiActionController } from '../cloud_sync_ui_action_controller_runtime.js';
import { useApp, useUiFeedback } from '../hooks.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../../services/api.js';

export type CloudSyncPanelActionsState = {
  api: CloudSyncServiceLike | undefined;
  status: string;
  isPublic: boolean | null;
  floatingSync: boolean;
  conflict: CloudSyncPanelSnapshot['conflict'];
  handleToggleRoomMode: () => void;
  handleCopy: () => void;
  handleSyncSketch: () => void;
  handleDeleteModels: () => void;
  handleDeleteColors: () => void;
  handleFloatingSyncChange: (enabled: boolean) => Promise<void>;
  handleResolveConflict: (resolution: CloudSyncConflictResolution) => void;
};

const FALLBACK_PANEL_SNAPSHOT: CloudSyncPanelSnapshot = {
  room: '',
  isPublic: null,
  status: 'סנכרון לא פעיל',
  credentialState: 'offline',
  credentialExpiresAt: '',
  retryAt: 0,
  failureKind: 'network',
  floatingSync: false,
};

function readCloudSyncPanelSnapshot(api: CloudSyncServiceLike | undefined): CloudSyncPanelSnapshot {
  try {
    if (api?.getPanelSnapshot) {
      const snapshot = api.getPanelSnapshot();
      if (snapshot && typeof snapshot === 'object') {
        return {
          room: typeof snapshot.room === 'string' ? snapshot.room : '',
          isPublic: typeof snapshot.isPublic === 'boolean' ? snapshot.isPublic : null,
          status:
            typeof snapshot.status === 'string' && snapshot.status
              ? snapshot.status
              : FALLBACK_PANEL_SNAPSHOT.status,
          credentialState: snapshot.credentialState || 'missing',
          credentialExpiresAt: snapshot.credentialExpiresAt || '',
          retryAt: Number(snapshot.retryAt) || 0,
          failureKind: snapshot.failureKind || '',
          floatingSync: !!snapshot.floatingSync,
          ...(snapshot.conflict
            ? {
                conflict: {
                  conflictId: String(snapshot.conflict.conflictId || ''),
                  generation: Number(snapshot.conflict.generation) || 0,
                  room: String(snapshot.conflict.room || ''),
                  keys: Array.isArray(snapshot.conflict.keys)
                    ? snapshot.conflict.keys.map(key => String(key))
                    : [],
                  remoteRevision: Number(snapshot.conflict.remoteRevision) || 0,
                  detectedAt: Number(snapshot.conflict.detectedAt) || 0,
                  state: snapshot.conflict.state,
                  canKeepLocal: snapshot.conflict.canKeepLocal === true,
                  canUseRemote: snapshot.conflict.canUseRemote === true,
                  ...(snapshot.conflict.limitationReason
                    ? { limitationReason: snapshot.conflict.limitationReason }
                    : {}),
                },
              }
            : {}),
        };
      }
    }

    const room = api?.getCurrentRoom ? String(api.getCurrentRoom() || '') : '';
    const publicRoom = api?.getPublicRoom ? String(api.getPublicRoom() || '') : 'public';
    return {
      room,
      isPublic: room ? room === publicRoom : null,
      status: room
        ? room === publicRoom
          ? 'מצב: ציבורי (כולם רואים)'
          : `מצב: חדר פרטי (${room})`
        : FALLBACK_PANEL_SNAPSHOT.status,
      credentialState: room === publicRoom ? 'public' : 'missing',
      credentialExpiresAt: '',
      retryAt: 0,
      failureKind: '',
      floatingSync: api?.isFloatingSketchSyncEnabled ? !!api.isFloatingSketchSyncEnabled() : false,
    };
  } catch {
    return FALLBACK_PANEL_SNAPSHOT;
  }
}

function useCloudSyncPanelSnapshot(api: CloudSyncServiceLike | undefined): CloudSyncPanelSnapshot {
  const cachedSnapshotRef = useRef<CloudSyncPanelSnapshot | null>(null);

  const getSnapshot = useCallback((): CloudSyncPanelSnapshot => {
    const next = readCloudSyncPanelSnapshot(api);
    const prev = cachedSnapshotRef.current;
    if (
      prev &&
      prev.room === next.room &&
      prev.isPublic === next.isPublic &&
      prev.status === next.status &&
      prev.credentialState === next.credentialState &&
      prev.credentialExpiresAt === next.credentialExpiresAt &&
      prev.retryAt === next.retryAt &&
      prev.failureKind === next.failureKind &&
      prev.floatingSync === next.floatingSync &&
      (prev.conflict?.room || '') === (next.conflict?.room || '') &&
      (prev.conflict?.keys || []).join('|') === (next.conflict?.keys || []).join('|') &&
      Number(prev.conflict?.remoteRevision || 0) === Number(next.conflict?.remoteRevision || 0) &&
      Number(prev.conflict?.detectedAt || 0) === Number(next.conflict?.detectedAt || 0) &&
      (prev.conflict?.state || '') === (next.conflict?.state || '')
    ) {
      return prev;
    }
    cachedSnapshotRef.current = next;
    return next;
  }, [api]);

  const subscribe = useCallback(
    (cb: () => void) => {
      try {
        if (api?.subscribePanelSnapshot) {
          const unsub = api.subscribePanelSnapshot(() => cb());
          return typeof unsub === 'function' ? unsub : () => undefined;
        }
        if (api?.subscribeFloatingSketchSyncEnabled) {
          const unsub = api.subscribeFloatingSketchSyncEnabled(() => cb());
          return typeof unsub === 'function' ? unsub : () => undefined;
        }
      } catch {
        return () => undefined;
      }
      return () => undefined;
    },
    [api]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCloudSyncPanelActions(): CloudSyncPanelActionsState {
  const app = useApp();
  const fb = useUiFeedback();
  const api: CloudSyncServiceLike | undefined = getCloudSyncServiceMaybe(app) || undefined;
  const panelSnapshot = useCloudSyncPanelSnapshot(api);
  const { status, isPublic, floatingSync, conflict } = panelSnapshot;
  const cloudSyncUiController = useMemo(() => createCloudSyncUiActionController({ app, fb }), [app, fb]);

  const handleToggleRoomMode = useCallback(() => {
    void runPerfAction(
      app,
      'cloudSync.roomMode.toggle',
      () => cloudSyncUiController.toggleRoomMode(isPublic),
      {
        detail: { isPublic },
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [app, cloudSyncUiController, isPublic]);

  const handleCopy = useCallback(() => {
    void runPerfAction(app, 'cloudSync.copyLink', () => cloudSyncUiController.copyShareLink(), {
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    });
  }, [app, cloudSyncUiController]);

  const handleSyncSketch = useCallback(() => {
    void runPerfAction(app, 'cloudSync.syncSketch', () => cloudSyncUiController.syncSketch(), {
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    });
  }, [app, cloudSyncUiController]);

  const handleDeleteModels = useCallback(() => {
    void runPerfAction(
      app,
      'cloudSync.deleteTemporaryModels',
      () => cloudSyncUiController.deleteTemporaryModels(),
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [app, cloudSyncUiController]);

  const handleDeleteColors = useCallback(() => {
    void runPerfAction(
      app,
      'cloudSync.deleteTemporaryColors',
      () => cloudSyncUiController.deleteTemporaryColors(),
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [app, cloudSyncUiController]);

  const handleFloatingSyncChange = useCallback(
    async (enabled: boolean) => {
      await runPerfAction(
        app,
        'cloudSync.floatingSync.toggle',
        () => cloudSyncUiController.setFloatingSyncEnabled(enabled),
        {
          detail: { enabled },
          resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
        }
      );
    },
    [app, cloudSyncUiController]
  );

  const handleResolveConflict = useCallback(
    (resolution: CloudSyncConflictResolution) => {
      void runPerfAction(
        app,
        `cloudSync.conflict.${resolution}`,
        () => cloudSyncUiController.resolveConflict(resolution, conflict?.conflictId),
        {
          detail: { resolution, keys: conflict?.keys || [] },
          resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
        }
      );
    },
    [app, cloudSyncUiController, conflict]
  );

  return {
    api,
    status,
    isPublic,
    floatingSync,
    conflict,
    handleToggleRoomMode,
    handleCopy,
    handleSyncSketch,
    handleDeleteModels,
    handleDeleteColors,
    handleFloatingSyncChange,
    handleResolveConflict,
  };
}
