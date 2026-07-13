import type { AppContainer, CloudSyncRoomModeCommandResult } from '../../../../types';

import { reportCloudSyncRoomModeResult } from '../cloud_sync_action_feedback.js';

import type { ResolvedCloudSyncUiActionCommands } from './cloud_sync_ui_action_controller_commands.js';
import {
  buildRoomModeErrorResult,
  type CloudSyncUiFeedbackLike,
} from './cloud_sync_ui_action_controller_shared.js';

export async function runCloudSyncUiToggleRoomMode(args: {
  app: AppContainer;
  fb: CloudSyncUiFeedbackLike | null | undefined;
  commands: ResolvedCloudSyncUiActionCommands;
  isPublic: boolean | null | undefined;
}): Promise<CloudSyncRoomModeCommandResult> {
  const { app, fb, commands, isPublic } = args;
  const nextMode = isPublic ? 'private' : 'public';
  try {
    const result = await (isPublic ? commands.goPrivateCommand(app) : commands.goPublicCommand(app));
    reportCloudSyncRoomModeResult(fb, result);
    return result;
  } catch (err) {
    const result = buildRoomModeErrorResult(nextMode, err);
    reportCloudSyncRoomModeResult(fb, result);
    return result;
  }
}
