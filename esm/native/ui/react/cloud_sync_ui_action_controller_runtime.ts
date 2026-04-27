import {
  runCloudSyncUiCopyShareLink,
  runCloudSyncUiDeleteTemporary,
  runCloudSyncUiSetFloatingSyncEnabled,
  runCloudSyncUiSyncSketch,
  runCloudSyncUiToggleFloatingSyncEnabled,
  runCloudSyncUiToggleSite2TabsGate,
} from './cloud_sync_ui_action_controller_mutations.js';
import { runCloudSyncUiToggleRoomMode } from './cloud_sync_ui_action_controller_room.js';
import { resolveCloudSyncUiActionCommands } from './cloud_sync_ui_action_controller_commands.js';

import type {
  CloudSyncUiActionController,
  CreateCloudSyncUiActionControllerArgs,
} from './cloud_sync_ui_action_controller_shared.js';

export type {
  CloudSyncUiActionController,
  CreateCloudSyncUiActionControllerArgs,
} from './cloud_sync_ui_action_controller_shared.js';

export function createCloudSyncUiActionController(
  args: CreateCloudSyncUiActionControllerArgs
): CloudSyncUiActionController {
  const { app, fb } = args;
  const commands = resolveCloudSyncUiActionCommands(args);

  return {
    toggleRoomMode(isPublic) {
      return runCloudSyncUiToggleRoomMode({ app, fb, commands, isPublic });
    },

    async copyShareLink() {
      return await runCloudSyncUiCopyShareLink({ app, fb, commands });
    },

    async syncSketch() {
      return await runCloudSyncUiSyncSketch({ app, fb, commands });
    },

    async deleteTemporaryModels() {
      return await runCloudSyncUiDeleteTemporary({ app, fb, commands, kind: 'models' });
    },

    async deleteTemporaryColors() {
      return await runCloudSyncUiDeleteTemporary({ app, fb, commands, kind: 'colors' });
    },

    async setFloatingSyncEnabled(enabled: boolean) {
      return await runCloudSyncUiSetFloatingSyncEnabled({ app, fb, commands, enabled });
    },

    async toggleFloatingSyncEnabled() {
      return await runCloudSyncUiToggleFloatingSyncEnabled({ app, fb, commands });
    },

    async toggleSite2TabsGate(nextOpen, meta) {
      return await runCloudSyncUiToggleSite2TabsGate({ app, fb, commands, nextOpen, meta });
    },
  };
}
