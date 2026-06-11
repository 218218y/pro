import type {
  CloudSyncPanelSnapshot,
  CloudSyncServiceLike,
  CloudSyncSite2TabsGateSnapshot,
} from '../../../types';

import {
  cloneCloudSyncPublicPanelSnapshot,
  cloneCloudSyncPublicSite2TabsGateSnapshot,
} from './cloud_sync_panel_api_public_support.js';
import type {
  CloudSyncListener,
  CloudSyncPanelApiInstallContext,
  InstallableCloudSyncPanelApi,
} from './cloud_sync_panel_api_install_context_runtime.js';

export type CloudSyncSubscriptionMethod<T> = ((fn: CloudSyncListener<T>) => void | (() => void)) | undefined;

export type CloudSyncSubscriptionBridge<T> = {
  listeners: Set<CloudSyncListener<T>>;
  lastImpl: CloudSyncServiceLike | null;
  disposeSource: (() => void) | null;
  subscribeMethodName: keyof Pick<
    CloudSyncServiceLike,
    'subscribePanelSnapshot' | 'subscribeFloatingSketchSyncEnabled' | 'subscribeSite2TabsGateSnapshot'
  >;
  cloneValue: (value: T) => T;
};

export type CloudSyncPanelApiBridges = {
  panel: CloudSyncSubscriptionBridge<CloudSyncPanelSnapshot>;
  floating: CloudSyncSubscriptionBridge<boolean>;
  tabsGate: CloudSyncSubscriptionBridge<CloudSyncSite2TabsGateSnapshot>;
};

const cloudSyncPanelApiBridges = new WeakMap<object, CloudSyncPanelApiBridges>();

export function createCloudSyncSubscriptionBridge<T>(
  subscribeMethodName: CloudSyncSubscriptionBridge<T>['subscribeMethodName'],
  cloneValue: (value: T) => T
): CloudSyncSubscriptionBridge<T> {
  return {
    listeners: new Set<CloudSyncListener<T>>(),
    lastImpl: null,
    disposeSource: null,
    subscribeMethodName,
    cloneValue,
  };
}

export function resolveCloudSyncPanelApiBridges(api: InstallableCloudSyncPanelApi): CloudSyncPanelApiBridges {
  let bridges = cloudSyncPanelApiBridges.get(api);
  if (!bridges) {
    bridges = {
      panel: createCloudSyncSubscriptionBridge<CloudSyncPanelSnapshot>(
        'subscribePanelSnapshot',
        cloneCloudSyncPublicPanelSnapshot
      ),
      floating: createCloudSyncSubscriptionBridge<boolean>(
        'subscribeFloatingSketchSyncEnabled',
        value => !!value
      ),
      tabsGate: createCloudSyncSubscriptionBridge<CloudSyncSite2TabsGateSnapshot>(
        'subscribeSite2TabsGateSnapshot',
        cloneCloudSyncPublicSite2TabsGateSnapshot
      ),
    };
    cloudSyncPanelApiBridges.set(api, bridges);
  }
  return bridges;
}

export function disposeCloudSyncBridgeSource<T>(bridge: CloudSyncSubscriptionBridge<T>): void {
  const dispose = bridge.disposeSource;
  bridge.disposeSource = null;
  bridge.lastImpl = null;
  if (typeof dispose === 'function') {
    try {
      dispose();
    } catch {
      // Best-effort detach; public surface healing should stay resilient.
    }
  }
}

export function disposeCloudSyncPanelApiBridges(bridges: CloudSyncPanelApiBridges): void {
  disposeCloudSyncBridgeSource(bridges.panel);
  disposeCloudSyncBridgeSource(bridges.floating);
  disposeCloudSyncBridgeSource(bridges.tabsGate);
}

export function relayCloudSyncBridgeValue<T>(bridge: CloudSyncSubscriptionBridge<T>, value: T): void {
  const canonicalValue = bridge.cloneValue(value);
  for (const listener of bridge.listeners) {
    try {
      listener(bridge.cloneValue(canonicalValue));
    } catch {
      // Listener isolation mirrors the source controllers.
    }
  }
}

export function refreshCloudSyncBridgeSubscription<T>(
  context: CloudSyncPanelApiInstallContext,
  bridge: CloudSyncSubscriptionBridge<T>
): void {
  const impl = context.impl;
  if (!bridge.listeners.size || !impl) {
    disposeCloudSyncBridgeSource(bridge);
    return;
  }
  if (bridge.lastImpl === impl && bridge.disposeSource) return;

  disposeCloudSyncBridgeSource(bridge);
  const subscribe = impl[bridge.subscribeMethodName] as CloudSyncSubscriptionMethod<T>;
  if (typeof subscribe !== 'function') return;

  bridge.lastImpl = impl;
  try {
    const dispose = subscribe((value: T) => {
      relayCloudSyncBridgeValue(bridge, value);
    });
    bridge.disposeSource = typeof dispose === 'function' ? dispose : null;
  } catch {
    bridge.disposeSource = null;
    bridge.lastImpl = null;
  }
}

export function refreshCloudSyncPanelApiBridgeSubscriptions(
  context: CloudSyncPanelApiInstallContext,
  bridges: CloudSyncPanelApiBridges
): void {
  refreshCloudSyncBridgeSubscription(context, bridges.panel);
  refreshCloudSyncBridgeSubscription(context, bridges.floating);
  refreshCloudSyncBridgeSubscription(context, bridges.tabsGate);
}

export function subscribeCloudSyncBridge<T>(
  context: CloudSyncPanelApiInstallContext,
  bridge: CloudSyncSubscriptionBridge<T>,
  fn: CloudSyncListener<T>
): () => void {
  bridge.listeners.add(fn);
  refreshCloudSyncBridgeSubscription(context, bridge);
  return (): void => {
    bridge.listeners.delete(fn);
    if (!bridge.listeners.size) disposeCloudSyncBridgeSource(bridge);
  };
}
