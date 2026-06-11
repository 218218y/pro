import type {
  CloudSyncDeleteTempResult,
  CloudSyncPanelApiDeps,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
} from '../../../types';

import {
  runFloatingSketchSyncPinCommand,
  toggleFloatingSketchSyncPinCommand,
} from './cloud_sync_sync_pin_command.js';
import type {
  CloudSyncPanelApiRuntimeCommands,
  CloudSyncPanelApiRuntimeShared,
} from './cloud_sync_panel_api_commands_runtime_shared.js';
import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';

export type CloudSyncPanelApiMutationCommands = Pick<
  CloudSyncPanelApiRuntimeCommands,
  | 'syncSketchNow'
  | 'isFloatingSketchSyncEnabled'
  | 'setFloatingSketchSyncEnabled'
  | 'toggleFloatingSketchSyncEnabled'
  | 'subscribeFloatingSketchSyncEnabled'
  | 'deleteTemporaryModels'
  | 'deleteTemporaryColors'
>;

export function createCloudSyncPanelApiMutationCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController,
  shared: CloudSyncPanelApiRuntimeShared
): CloudSyncPanelApiMutationCommands {
  const {
    App,
    reportNonFatal,
    syncSketchNow,
    getFloatingSketchSyncEnabled,
    setFloatingSketchSyncEnabledState,
    pushFloatingSketchSyncPinnedNow,
    subscribeFloatingSketchSyncEnabledState,
    deleteTemporaryModelsInCloud,
    deleteTemporaryColorsInCloud,
  } = deps;

  return {
    syncSketchNow: async (): Promise<CloudSyncSketchCommandResult> => await syncSketchNow(),

    isFloatingSketchSyncEnabled: (): boolean => {
      try {
        return !!getFloatingSketchSyncEnabled();
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('isFloatingSketchSyncEnabled'), __wpErr, { throttleMs: 4000 });
        return false;
      }
    },

    setFloatingSketchSyncEnabled: async (enabled: boolean): Promise<CloudSyncSyncPinCommandResult> => {
      try {
        const result = await runFloatingSketchSyncPinCommand(
          {
            App,
            getFloatingSketchSyncEnabled,
            setFloatingSketchSyncEnabledState,
            pushFloatingSketchSyncPinnedNow,
            reportNonFatal,
          },
          !!enabled
        );
        snapshots.publishPanelSnapshot();
        return result;
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('setFloatingSketchSyncEnabled'), __wpErr, { throttleMs: 4000 });
        snapshots.publishPanelSnapshot(undefined, true);
        return shared.readSyncPinFailure(__wpErr);
      }
    },

    toggleFloatingSketchSyncEnabled: async (): Promise<CloudSyncSyncPinCommandResult> => {
      try {
        const result = await toggleFloatingSketchSyncPinCommand({
          App,
          getFloatingSketchSyncEnabled,
          setFloatingSketchSyncEnabledState,
          pushFloatingSketchSyncPinnedNow,
          reportNonFatal,
        });
        snapshots.publishPanelSnapshot();
        return result;
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('toggleFloatingSketchSyncEnabled'), __wpErr, {
          throttleMs: 4000,
        });
        snapshots.publishPanelSnapshot(undefined, true);
        return shared.readSyncPinFailure(__wpErr);
      }
    },

    subscribeFloatingSketchSyncEnabled: (fn: (enabled: boolean) => void): (() => void) =>
      subscribeFloatingSketchSyncEnabledState(fn),

    deleteTemporaryModels: async (): Promise<CloudSyncDeleteTempResult> => {
      try {
        return await deleteTemporaryModelsInCloud();
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('deleteTemporaryModels'), __wpErr, { throttleMs: 4000 });
        return shared.readDeleteTempFailure(__wpErr);
      }
    },

    deleteTemporaryColors: async (): Promise<CloudSyncDeleteTempResult> => {
      try {
        return await deleteTemporaryColorsInCloud();
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('deleteTemporaryColors'), __wpErr, { throttleMs: 4000 });
        return shared.readDeleteTempFailure(__wpErr);
      }
    },
  };
}
