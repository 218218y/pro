import { normalizeUnknownError } from '../runtime/error_normalization.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  resolveRealtimeCreateClient,
  getRealtimeChannel,
  type CloudSyncRealtimeFactory,
} from './cloud_sync_realtime.js';
import { markCloudSyncRealtimeConnecting } from './cloud_sync_lifecycle_realtime_support.js';
import {
  cleanupStaleRealtimeStart,
  type CloudSyncRealtimeChannelStartArgs,
  type CloudSyncTransientRealtimeRefs,
} from './cloud_sync_lifecycle_realtime_channel_shared.js';
import { subscribeCloudSyncRealtimeChannel } from './cloud_sync_lifecycle_realtime_channel_subscribe.js';

export type { CloudSyncRealtimeChannelStartArgs } from './cloud_sync_lifecycle_realtime_channel_shared.js';

export async function startCloudSyncRealtimeChannel(args: CloudSyncRealtimeChannelStartArgs): Promise<void> {
  const {
    App,
    cfg,
    room,
    clientId,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    isDisposed,
    pullAllNow,
    startPolling,
    stopPolling,
    markRealtimeEvent,
    realtimeScopedHandlers,
    addListener,
    setTimeoutFn,
    refs,
    setSendRealtimeHint,
    transport,
    restartRealtime,
  } = args;

  const transportToken = transport.getTransportToken();
  const disconnectStateRef = { current: false };
  const transientRefs: CloudSyncTransientRealtimeRefs = {
    client: null,
    channel: null,
  };

  const isCurrentRealtimeStart = (): boolean =>
    !isDisposed() && transportToken === transport.getTransportToken();

  const abandonStaleRealtimeStart = (): void => {
    cleanupStaleRealtimeStart({ refs, transient: transientRefs });
  };

  try {
    let createClient: CloudSyncRealtimeFactory | null = null;
    try {
      createClient = await resolveRealtimeCreateClient(App);
    } catch (err) {
      _cloudSyncReportNonFatal(App, 'realtime.testHook.createClient', err, { throttleMs: 10000 });
    }

    if (!isCurrentRealtimeStart()) {
      abandonStaleRealtimeStart();
      return;
    }

    if (typeof createClient !== 'function') {
      transport.setRealtimeFailure('missing-sdk', 'createClient not found', '', 'missing-sdk');
      return;
    }

    markCloudSyncRealtimeConnecting({
      runtimeStatus,
      publishStatus,
      diag,
      enabled: !!cfg.realtime,
      mode: cfg.realtimeMode,
      channel: `${cfg.realtimeChannelPrefix}:${room}`,
    });

    transientRefs.client = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: `wp-cloud-sync-realtime:${room}:${clientId}:${transportToken}`,
      },
    });
    refs.client = transientRefs.client;

    if (!isCurrentRealtimeStart()) {
      abandonStaleRealtimeStart();
      return;
    }

    const channelName = `${cfg.realtimeChannelPrefix}:${room}`;
    const channelOpts = { config: { private: false, broadcast: { self: false, ack: false } } };
    transientRefs.channel = getRealtimeChannel(refs.client, channelName, channelOpts);
    refs.channel = transientRefs.channel;

    if (!isCurrentRealtimeStart()) {
      abandonStaleRealtimeStart();
      return;
    }

    const chan = refs.channel;
    if (!chan) {
      transport.setRealtimeFailure('error', 'channel() not available', 'realtime:error', 'missing-channel');
      return;
    }

    const subscriptionResult = subscribeCloudSyncRealtimeChannel({
      App,
      cfg,
      room,
      clientId,
      runtimeStatus,
      publishStatus,
      diag,
      suppressRef,
      isDisposed,
      pullAllNow,
      startPolling,
      stopPolling,
      markRealtimeEvent,
      realtimeScopedHandlers,
      addListener,
      setTimeoutFn,
      refs,
      setSendRealtimeHint,
      transport,
      restartRealtime,
      transportToken,
      disconnectStateRef,
      isCurrentRealtimeStart,
      chan,
    });

    if (subscriptionResult === 'stale') {
      abandonStaleRealtimeStart();
      return;
    }
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'realtime.start', err, { throttleMs: 6000 });
    transport.setRealtimeFailure(
      'error',
      normalizeUnknownError(err).message,
      'realtime:error',
      'realtime-error'
    );
  }
}
