import type {
  AppContainer,
  ActionMetaLike,
  CloudSyncDeleteTempResult,
  CloudSyncRoomModeCommandResult,
  CloudSyncServiceLike,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../../../types';

import { getCloudSyncServiceMaybe } from '../../../services/api.js';
import { setUiSite2TabsGateOpen } from './store_actions.js';

type CloudSyncAsyncCommandSpec<Args extends unknown[], Result> = {
  call: (service: CloudSyncServiceLike | null, ...args: Args) => Promise<Result> | null;
  fallback: (...args: Args) => Result;
};

type CloudSyncSyncCommandSpec<Args extends unknown[], Result> = {
  call: (service: CloudSyncServiceLike | null, ...args: Args) => Result | null;
  fallback: (...args: Args) => Result;
};

function buildTabsGateFallbackResult(open: boolean): CloudSyncTabsGateCommandResult {
  return { ok: true, changed: true, open: !!open, until: 0 };
}

function buildFloatingSyncFallbackResult(): CloudSyncSyncPinCommandResult {
  return { ok: false, reason: 'not-installed' };
}

function buildSketchSyncFallbackResult(): CloudSyncSketchCommandResult {
  return { ok: false, reason: 'not-installed' };
}

function buildDeleteTempFallbackResult(): CloudSyncDeleteTempResult {
  return { ok: false, removed: 0, reason: 'not-installed' };
}

function buildShareLinkFallbackResult(): CloudSyncShareLinkCommandResult {
  return { ok: false, reason: 'not-installed' };
}

function buildRoomModeFallbackResult(mode: 'public' | 'private'): CloudSyncRoomModeCommandResult {
  return { ok: false, mode, reason: 'not-installed' };
}

function readCloudSyncService(app: AppContainer): CloudSyncServiceLike | null {
  return getCloudSyncServiceMaybe(app);
}

function runCloudSyncSyncCommand<Args extends unknown[], Result>(
  app: AppContainer,
  spec: CloudSyncSyncCommandSpec<Args, Result>,
  ...args: Args
): Result {
  return spec.call(readCloudSyncService(app), ...args) ?? spec.fallback(...args);
}

async function runCloudSyncAsyncCommand<Args extends unknown[], Result>(
  app: AppContainer,
  spec: CloudSyncAsyncCommandSpec<Args, Result>,
  ...args: Args
): Promise<Result> {
  const result = spec.call(readCloudSyncService(app), ...args);
  return result ? await result : spec.fallback(...args);
}

const CLOUD_SYNC_ASYNC_COMMANDS = {
  syncSketchNow: {
    call: (service: CloudSyncServiceLike | null) =>
      typeof service?.syncSketchNow === 'function' ? service.syncSketchNow() : null,
    fallback: () => buildSketchSyncFallbackResult(),
  },
  deleteTemporaryModels: {
    call: (service: CloudSyncServiceLike | null) =>
      typeof service?.deleteTemporaryModels === 'function' ? service.deleteTemporaryModels() : null,
    fallback: () => buildDeleteTempFallbackResult(),
  },
  deleteTemporaryColors: {
    call: (service: CloudSyncServiceLike | null) =>
      typeof service?.deleteTemporaryColors === 'function' ? service.deleteTemporaryColors() : null,
    fallback: () => buildDeleteTempFallbackResult(),
  },
  setFloatingSketchSyncEnabled: {
    call: (service: CloudSyncServiceLike | null, enabled: boolean) =>
      typeof service?.setFloatingSketchSyncEnabled === 'function'
        ? service.setFloatingSketchSyncEnabled(!!enabled)
        : null,
    fallback: () => buildFloatingSyncFallbackResult(),
  },
  copyShareLink: {
    call: (service: CloudSyncServiceLike | null) =>
      typeof service?.copyShareLink === 'function' ? service.copyShareLink() : null,
    fallback: () => buildShareLinkFallbackResult(),
  },
} satisfies {
  syncSketchNow: CloudSyncAsyncCommandSpec<[], CloudSyncSketchCommandResult>;
  deleteTemporaryModels: CloudSyncAsyncCommandSpec<[], CloudSyncDeleteTempResult>;
  deleteTemporaryColors: CloudSyncAsyncCommandSpec<[], CloudSyncDeleteTempResult>;
  setFloatingSketchSyncEnabled: CloudSyncAsyncCommandSpec<[boolean], CloudSyncSyncPinCommandResult>;
  copyShareLink: CloudSyncAsyncCommandSpec<[], CloudSyncShareLinkCommandResult>;
};

const CLOUD_SYNC_SYNC_COMMANDS = {
  goPublic: {
    call: (service: CloudSyncServiceLike | null) =>
      typeof service?.goPublic === 'function' ? service.goPublic() : null,
    fallback: () => buildRoomModeFallbackResult('public'),
  },
  goPrivate: {
    call: (service: CloudSyncServiceLike | null) =>
      typeof service?.goPrivate === 'function' ? service.goPrivate() : null,
    fallback: () => buildRoomModeFallbackResult('private'),
  },
} satisfies {
  goPublic: CloudSyncSyncCommandSpec<[], CloudSyncRoomModeCommandResult>;
  goPrivate: CloudSyncSyncCommandSpec<[], CloudSyncRoomModeCommandResult>;
};

export async function toggleSite2TabsGate(
  app: AppContainer,
  nextOpen: boolean,
  meta: ActionMetaLike
): Promise<CloudSyncTabsGateCommandResult> {
  const service = readCloudSyncService(app);
  if (typeof service?.setSite2TabsGateOpen === 'function') {
    return await service.setSite2TabsGateOpen(!!nextOpen);
  }
  setUiSite2TabsGateOpen(app, !!nextOpen, meta);
  return buildTabsGateFallbackResult(!!nextOpen);
}

export async function syncSketchNow(app: AppContainer): Promise<CloudSyncSketchCommandResult> {
  return await runCloudSyncAsyncCommand(app, CLOUD_SYNC_ASYNC_COMMANDS.syncSketchNow);
}

export async function deleteTemporaryModels(app: AppContainer): Promise<CloudSyncDeleteTempResult> {
  return await runCloudSyncAsyncCommand(app, CLOUD_SYNC_ASYNC_COMMANDS.deleteTemporaryModels);
}

export async function deleteTemporaryColors(app: AppContainer): Promise<CloudSyncDeleteTempResult> {
  return await runCloudSyncAsyncCommand(app, CLOUD_SYNC_ASYNC_COMMANDS.deleteTemporaryColors);
}

export async function setFloatingSketchSyncEnabled(
  app: AppContainer,
  enabled: boolean
): Promise<CloudSyncSyncPinCommandResult> {
  return await runCloudSyncAsyncCommand(
    app,
    CLOUD_SYNC_ASYNC_COMMANDS.setFloatingSketchSyncEnabled,
    !!enabled
  );
}

export async function toggleFloatingSketchSyncEnabled(
  app: AppContainer
): Promise<CloudSyncSyncPinCommandResult> {
  const service = readCloudSyncService(app);
  if (typeof service?.toggleFloatingSketchSyncEnabled === 'function') {
    return await service.toggleFloatingSketchSyncEnabled();
  }
  const enabled =
    typeof service?.isFloatingSketchSyncEnabled === 'function'
      ? service.isFloatingSketchSyncEnabled()
      : false;
  return await setFloatingSketchSyncEnabled(app, !enabled);
}

export async function copyCloudSyncShareLink(app: AppContainer): Promise<CloudSyncShareLinkCommandResult> {
  return await runCloudSyncAsyncCommand(app, CLOUD_SYNC_ASYNC_COMMANDS.copyShareLink);
}

export function goCloudSyncPublic(app: AppContainer): CloudSyncRoomModeCommandResult {
  return runCloudSyncSyncCommand(app, CLOUD_SYNC_SYNC_COMMANDS.goPublic);
}

export function goCloudSyncPrivate(app: AppContainer): CloudSyncRoomModeCommandResult {
  return runCloudSyncSyncCommand(app, CLOUD_SYNC_SYNC_COMMANDS.goPrivate);
}
