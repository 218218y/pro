import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const shared = readSource(
  '../esm/native/services/cloud_sync_owner_context_runtime_shared.ts',
  import.meta.url
);
const access = readSource(
  '../esm/native/services/cloud_sync_owner_context_runtime_access.ts',
  import.meta.url
);
const client = readSource(
  '../esm/native/services/cloud_sync_owner_context_runtime_client.ts',
  import.meta.url
);
const gatewayRuntime = readSource(
  '../esm/native/services/cloud_sync_owner_gateway_runtime.ts',
  import.meta.url
);
const credentialSession = readSource(
  '../esm/native/services/cloud_sync_owner_gateway_credential_session.ts',
  import.meta.url
);
const rowCache = readSource('../esm/native/services/cloud_sync_owner_gateway_row_cache.ts', import.meta.url);
const conflictJournal = readSource(
  '../esm/native/services/cloud_sync_owner_gateway_conflict_journal.ts',
  import.meta.url
);
const transport = readSource('../esm/native/services/cloud_sync_owner_gateway_transport.ts', import.meta.url);
const conflictResolution = readSource(
  '../esm/native/services/cloud_sync_owner_gateway_conflict_resolution.ts',
  import.meta.url
);
const remoteAdoption = readSource(
  '../esm/native/services/cloud_sync_owner_gateway_remote_adoption.ts',
  import.meta.url
);

test('cloud sync owner context runtime keeps browser access and client identity in focused owners', () => {
  assertMatchesAll(
    assert,
    shared,
    [
      /CLOUD_SYNC_CLIENT_KEY/,
      /CLOUD_SYNC_DIAG_LS_KEY/,
      /resolveCloudSyncOwnerStorageKeys/,
      /getCloudSyncDiagStorageMaybe/,
      /getCloudSyncClipboardMaybe/,
      /getCloudSyncPromptSinkMaybe/,
    ],
    'cloud sync owner context runtime shared'
  );

  assertMatchesAll(
    assert,
    access,
    [
      /getBrowserFetchMaybe\(/,
      /getBrowserTimers\(/,
      /getStorageServiceMaybe\(/,
      /createCloudSyncOwnerGatewayIo/,
      /createCloudSyncOwnerGatewayRuntime\(/,
      /createCloudSyncOwnerTimers/,
      /resolveCloudSyncOwnerStorage/,
    ],
    'cloud sync owner context runtime access'
  );

  assertMatchesAll(
    assert,
    client,
    [/sessionStorage/, /randomCloudSyncIdSegment\(/, /resolveCloudSyncClientId/, /CLOUD_SYNC_CLIENT_KEY/],
    'cloud sync owner context runtime client'
  );

  assertLacksAll(
    assert,
    shared,
    [/getBrowserFetchMaybe\(/, /getBrowserTimers\(/, /getStorageServiceMaybe\(/, /sessionStorage/],
    'cloud sync owner context runtime shared'
  );
  assertLacksAll(
    assert,
    access,
    [
      /sessionStorage/,
      /randomCloudSyncIdSegment\(/,
      /issuePublicRoomCredential\(/,
      /renewPrivateRoomCredential\(/,
      /createCloudSyncConflictStore\(/,
      /mergeCloudSyncPayloads\(/,
      /rebaseCloudSyncKeepLocal\(/,
      /new Map<string, CloudSyncStateRow>/,
    ],
    'cloud sync owner context runtime access'
  );
});

test('cloud sync owner gateway composes independent credential, cache, journal, transport, resolution, and adoption owners', () => {
  assertMatchesAll(
    assert,
    gatewayRuntime,
    [
      /createCloudSyncOwnerCredentialSession\(/,
      /createCloudSyncOwnerRowCache\(/,
      /createCloudSyncOwnerConflictJournal\(/,
      /createCloudSyncOwnerGatewayTransport\(/,
      /createCloudSyncOwnerConflictResolutionMachine\(/,
    ],
    'cloud sync owner gateway runtime'
  );

  assertMatchesAll(
    assert,
    credentialSession,
    [
      /publicCredentialPromise/,
      /privateCredentialPromise/,
      /renewPrivateRoomCredential\(/,
      /resolveRoomCredential/,
      /readActiveRateLimitFailure/,
    ],
    'cloud sync credential session'
  );

  assertMatchesAll(
    assert,
    rowCache,
    [/new Map<string, CloudSyncStateRow>/, /read\(room: string\)/, /write\(row:/],
    'cloud sync row cache'
  );

  assertMatchesAll(
    assert,
    conflictJournal,
    [
      /createCloudSyncConflictStore\(/,
      /publishConflictStatus/,
      /reconcileStoredConflict/,
      /finalizeConflictStatus/,
      /activeConflictBase/,
    ],
    'cloud sync conflict journal'
  );

  assertMatchesAll(
    assert,
    transport,
    [/getGatewayRow\(/, /writeGatewayRow\(/, /mergeCloudSyncPayloads\(/, /conflicts\.publishConflict\(/],
    'cloud sync gateway transport'
  );

  assertMatchesAll(
    assert,
    conflictResolution,
    [
      /runExclusive\(/,
      /rebaseCloudSyncKeepLocal\(/,
      /createCloudSyncRemoteAdoptionCoordinator\(/,
      /conflicts\.publishState\(/,
      /conflicts\.finalize\(/,
    ],
    'cloud sync conflict resolution machine'
  );

  assertMatchesAll(
    assert,
    remoteAdoption,
    [
      /revision-mismatch/,
      /readCloudSyncGatewayPayloadDifferenceKeys\(/,
      /adoptAtRevision/,
      /conflicts\.publishConflict\(/,
    ],
    'cloud sync remote adoption coordinator'
  );
});
