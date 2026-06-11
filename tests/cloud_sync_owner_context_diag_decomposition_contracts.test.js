import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_owner_context_diag.ts', import.meta.url);
const diagRuntime = readSource(
  '../esm/native/services/cloud_sync_owner_context_diag_runtime.ts',
  import.meta.url
);
const publicationRuntime = readSource(
  '../esm/native/services/cloud_sync_owner_context_status_publication_runtime.ts',
  import.meta.url
);

function assertLineCountAtMost(source, max, label) {
  const lineCount = String(source || '')
    .trimEnd()
    .split('\n').length;
  assert.equal(lineCount <= max, true, `${label} should stay at or below ${max} lines (got ${lineCount})`);
}

test('[cloud-sync-owner-context-diag] facade stays thin while diag + status publication policy live on dedicated runtimes', () => {
  assertLineCountAtMost(facade, 80, 'ownerContextDiagFacade');
  assertMatchesAll(
    assert,
    facade,
    [
      /from '\.\/cloud_sync_owner_context_diag_runtime\.js';/,
      /from '\.\/cloud_sync_owner_context_status_publication_runtime\.js';/,
      /createCloudSyncOwnerStatusRuntime\(/,
    ],
    'ownerContextDiagFacade'
  );
  assertLacksAll(
    assert,
    facade,
    [
      /ensureCloudSyncServiceState\(/,
      /installCloudSyncStatusSurface\(/,
      /isCloudSyncPublicationEpochCurrent\(/,
      /console\.log\(/,
    ],
    'ownerContextDiagFacade'
  );
  assertMatchesAll(
    assert,
    diagRuntime,
    [/createCloudSyncOwnerDiagRuntime\(/, /CLOUD_SYNC_DIAG_LS_KEY/, /diag\.consoleLog/],
    'ownerContextDiagRuntime'
  );
  assertMatchesAll(
    assert,
    publicationRuntime,
    [
      /createCloudSyncOwnerStatusPublisher\(/,
      /publishCloudSyncOwnerStatusSurface\(/,
      /installCloudSyncStatusSurface\(/,
      /isCloudSyncStatusSurfaceFresh\(/,
    ],
    'ownerContextStatusPublicationRuntime'
  );
});
