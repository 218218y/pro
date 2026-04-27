import type { CloudSyncServiceLike } from '../../../types';

export type InstallableCloudSyncPanelApi = CloudSyncServiceLike & {
  __wpCloudSyncPanelApiInstalled?: boolean;
  __wpCloudSyncPanelApiImpl?: CloudSyncServiceLike;
};

export type CloudSyncPanelApiInstallContext = {
  impl: CloudSyncServiceLike | null;
};

export type CloudSyncListener<T> = (value: T) => void;

export type CloudSyncServiceMethodKey =
  | 'getCurrentRoom'
  | 'getPublicRoom'
  | 'getRoomParam'
  | 'getSyncRuntimeStatus'
  | 'setDiagnosticsEnabled'
  | 'getPanelSnapshot'
  | 'subscribePanelSnapshot'
  | 'goPublic'
  | 'goPrivate'
  | 'getShareLink'
  | 'copyShareLink'
  | 'syncSketchNow'
  | 'isFloatingSketchSyncEnabled'
  | 'setFloatingSketchSyncEnabled'
  | 'toggleFloatingSketchSyncEnabled'
  | 'subscribeFloatingSketchSyncEnabled'
  | 'deleteTemporaryModels'
  | 'deleteTemporaryColors'
  | 'isSite2TabsGateEnabled'
  | 'getSite2TabsGateSnapshot'
  | 'subscribeSite2TabsGateSnapshot'
  | 'getSite2TabsGateOpen'
  | 'getSite2TabsGateUntil'
  | 'setSite2TabsGateOpen'
  | 'toggleSite2TabsGateOpen';

type CloudSyncServiceMethodArgs<K extends CloudSyncServiceMethodKey> =
  NonNullable<CloudSyncServiceLike[K]> extends (...args: infer TArgs) => unknown ? TArgs : never;

type CloudSyncServiceMethodResult<K extends CloudSyncServiceMethodKey> =
  NonNullable<CloudSyncServiceLike[K]> extends (...args: never[]) => infer TResult ? TResult : never;

type CloudSyncServiceCallable<K extends CloudSyncServiceMethodKey> = (
  ...args: CloudSyncServiceMethodArgs<K>
) => CloudSyncServiceMethodResult<K>;

const cloudSyncPanelApiInstallContexts = new WeakMap<object, CloudSyncPanelApiInstallContext>();

function isInstallableCloudSyncPanelApi(value: unknown): value is InstallableCloudSyncPanelApi {
  return !!value && typeof value === 'object';
}

export function asInstallableCloudSyncPanelApi(value: unknown): InstallableCloudSyncPanelApi | null {
  return isInstallableCloudSyncPanelApi(value) ? value : null;
}

export function createCloudSyncPanelApiInstallContext(
  impl: CloudSyncServiceLike | null
): CloudSyncPanelApiInstallContext {
  return { impl };
}

export function refreshCloudSyncPanelApiInstallContext(
  context: CloudSyncPanelApiInstallContext,
  impl: CloudSyncServiceLike | null
): CloudSyncPanelApiInstallContext {
  context.impl = impl;
  return context;
}

export function resolveCloudSyncPanelApiInstallContext(
  api: InstallableCloudSyncPanelApi,
  impl: CloudSyncServiceLike | null
): CloudSyncPanelApiInstallContext {
  let context = cloudSyncPanelApiInstallContexts.get(api);
  if (!context) {
    context = createCloudSyncPanelApiInstallContext(impl);
    cloudSyncPanelApiInstallContexts.set(api, context);
    return context;
  }
  return refreshCloudSyncPanelApiInstallContext(context, impl);
}

export function readCloudSyncPanelApiImpl(
  context: CloudSyncPanelApiInstallContext
): CloudSyncServiceLike | null {
  return context.impl || null;
}

export function invokeCloudSyncPanelApi<K extends CloudSyncServiceMethodKey>(
  context: CloudSyncPanelApiInstallContext,
  key: K,
  fallback: CloudSyncServiceMethodResult<K>,
  ...args: CloudSyncServiceMethodArgs<K>
): CloudSyncServiceMethodResult<K> {
  const impl = readCloudSyncPanelApiImpl(context);
  const candidate = impl?.[key];
  if (typeof candidate !== 'function') return fallback;
  return (candidate as CloudSyncServiceCallable<K>)(...args);
}
