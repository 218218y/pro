import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_transport.ts',
  import.meta.url
);
const shared = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_transport_shared.ts',
  import.meta.url
);
const cleanup = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_transport_cleanup.ts',
  import.meta.url
);
const status = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_transport_status.ts',
  import.meta.url
);
const runtime = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_transport_runtime.ts',
  import.meta.url
);
const controls = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime_transport_controls.ts',
  import.meta.url
);

test('cloud sync realtime transport keeps a thin facade over shared/cleanup/status/runtime seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_lifecycle_realtime_transport_shared\.js/,
      /cloud_sync_lifecycle_realtime_transport_runtime\.js/,
      /export type \{[\s\S]*CloudSyncRealtimeTransportArgs[\s\S]*CloudSyncRealtimeTransport[\s\S]*\}/,
      /export \{ createCloudSyncRealtimeTransport \}/,
    ],
    'cloud sync realtime transport facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /cleanupCloudSyncRealtimeTransport\(/,
      /setCloudSyncRealtimeFailure\(/,
      /handleCloudSyncRealtimeDisconnect\(/,
    ],
    'cloud sync realtime transport facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncRealtimeRefs = \{/,
      /export type CloudSyncRealtimeTransportArgs = \{/,
      /export type CloudSyncRealtimeTransport = \{/,
      /createCloudSyncRealtimeTransportMutableState\(/,
      /invalidateCloudSyncRealtimeTransport\(/,
    ],
    'cloud sync realtime transport shared'
  );

  assertMatchesAll(
    assert,
    cleanup,
    [
      /clearCloudSyncRealtimeConnectTimer\(/,
      /cleanupCloudSyncRealtimeTransport\(/,
      /removeRealtimeChannel\(/,
      /disconnectRealtimeClient\(/,
    ],
    'cloud sync realtime transport cleanup'
  );

  assertMatchesAll(
    assert,
    status,
    [
      /setCloudSyncRealtimeFailure\(/,
      /handleCloudSyncRealtimeDisconnect\(/,
      /markCloudSyncRealtimeFailure\(/,
      /markCloudSyncRealtimeDisconnected\(/,
    ],
    'cloud sync realtime transport status'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /createCloudSyncRealtimeTransportMutableState\(/,
      /createCloudSyncRealtimeTransportControls\(/,
      /return \{/,
    ],
    'cloud sync realtime transport runtime'
  );

  assertMatchesAll(
    assert,
    controls,
    [
      /createCloudSyncRealtimeTransportControls\(/,
      /cleanupCloudSyncRealtimeTransport\(/,
      /setCloudSyncRealtimeFailure\(/,
      /handleCloudSyncRealtimeDisconnect\(/,
    ],
    'cloud sync realtime transport controls'
  );
});
