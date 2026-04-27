import type {
  ActionMetaLike,
  AppContainer,
  CloudSyncDeleteTempResult,
  CloudSyncRoomModeCommandResult,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../../types';

import {
  deleteTemporaryColorsWithConfirm,
  deleteTemporaryModelsWithConfirm,
  syncSketchNowCommand,
} from '../cloud_sync_mutation_commands.js';
import {
  copyCloudSyncShareLink,
  goCloudSyncPrivate,
  goCloudSyncPublic,
  setFloatingSketchSyncEnabled,
  toggleFloatingSketchSyncEnabled,
  toggleSite2TabsGate,
} from './actions/cloud_sync_actions.js';

import {
  type CreateCloudSyncUiActionControllerArgs,
  isCloudSyncUiActionFn,
} from './cloud_sync_ui_action_controller_shared.js';

export type ResolvedCloudSyncUiActionCommands = {
  copyShareLinkCommand: (app: AppContainer) => Promise<CloudSyncShareLinkCommandResult>;
  goPublicCommand: (app: AppContainer) => CloudSyncRoomModeCommandResult;
  goPrivateCommand: (app: AppContainer) => CloudSyncRoomModeCommandResult;
  syncSketchCommand: (app: AppContainer) => Promise<CloudSyncSketchCommandResult>;
  deleteModelsCommand: (app: AppContainer) => Promise<CloudSyncDeleteTempResult>;
  deleteColorsCommand: (app: AppContainer) => Promise<CloudSyncDeleteTempResult>;
  setFloatingSyncCommand: (app: AppContainer, enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  toggleFloatingSyncCommand: (app: AppContainer) => Promise<CloudSyncSyncPinCommandResult>;
  toggleSite2TabsGateCommand: (
    app: AppContainer,
    nextOpen: boolean,
    meta: ActionMetaLike
  ) => Promise<CloudSyncTabsGateCommandResult>;
};

export function resolveCloudSyncUiActionCommands(
  args: CreateCloudSyncUiActionControllerArgs
): ResolvedCloudSyncUiActionCommands {
  return {
    copyShareLinkCommand: isCloudSyncUiActionFn(args.copyCloudSyncShareLink)
      ? args.copyCloudSyncShareLink
      : copyCloudSyncShareLink,
    goPublicCommand: isCloudSyncUiActionFn(args.goCloudSyncPublic)
      ? args.goCloudSyncPublic
      : goCloudSyncPublic,
    goPrivateCommand: isCloudSyncUiActionFn(args.goCloudSyncPrivate)
      ? args.goCloudSyncPrivate
      : goCloudSyncPrivate,
    syncSketchCommand: isCloudSyncUiActionFn(args.syncSketchNowCommand)
      ? args.syncSketchNowCommand
      : syncSketchNowCommand,
    deleteModelsCommand: isCloudSyncUiActionFn(args.deleteTemporaryModelsWithConfirm)
      ? args.deleteTemporaryModelsWithConfirm
      : deleteTemporaryModelsWithConfirm,
    deleteColorsCommand: isCloudSyncUiActionFn(args.deleteTemporaryColorsWithConfirm)
      ? args.deleteTemporaryColorsWithConfirm
      : deleteTemporaryColorsWithConfirm,
    setFloatingSyncCommand: isCloudSyncUiActionFn(args.setFloatingSketchSyncEnabled)
      ? args.setFloatingSketchSyncEnabled
      : setFloatingSketchSyncEnabled,
    toggleFloatingSyncCommand: isCloudSyncUiActionFn(args.toggleFloatingSketchSyncEnabled)
      ? args.toggleFloatingSketchSyncEnabled
      : toggleFloatingSketchSyncEnabled,
    toggleSite2TabsGateCommand: isCloudSyncUiActionFn(args.toggleSite2TabsGate)
      ? args.toggleSite2TabsGate
      : toggleSite2TabsGate,
  };
}
