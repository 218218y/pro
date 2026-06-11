import type { AppContainer, ProjectIoLoadResultLike, ProjectLoadInputLike } from '../../../types';

import { flushHistoryPendingPushMaybe } from '../runtime/history_system_access.js';
import { asRecord } from '../runtime/record.js';
import { isExplicitSite2Bundle } from './cloud_sync_config.js';
import {
  loadCloudSketchProjectData,
  resolveCloudSketchPayloadFingerprint,
  resolveCloudSketchPullEligibility,
  resolveInitialCloudSketchCatchupDecision,
  shouldToastCloudSketchApplied,
} from './cloud_sync_sketch_pull_load.js';
import { _cloudSyncReportNonFatal, captureSketchSnapshot, __wp_toast } from './cloud_sync_support.js';
import { parseSketchPayload } from './cloud_sync_sketch_ops_shared.js';
import type {
  CloudSyncSketchRoomMutableState,
  CreateCloudSyncSketchRoomOpsDeps,
} from './cloud_sync_sketch_ops_sketch_state.js';

export type ParsedCloudSketchPayload = ReturnType<typeof parseSketchPayload>;
export type LoadRemoteSketchResult = {
  loadResult: ProjectIoLoadResultLike;
  remoteFingerprint: string;
};

export function loadRemoteSketch(
  App: AppContainer,
  remoteSketch: ProjectLoadInputLike
): ProjectIoLoadResultLike {
  let loadResult: ProjectIoLoadResultLike = { ok: false, reason: 'error' };
  try {
    try {
      flushHistoryPendingPushMaybe(App, {});
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.flushBeforePull', e, { throttleMs: 4000 });
    }

    loadResult = loadCloudSketchProjectData(App, remoteSketch);

    try {
      flushHistoryPendingPushMaybe(App, {});
    } catch (e) {
      _cloudSyncReportNonFatal(App, 'cloudSketch.flushAfterPull', e, { throttleMs: 4000 });
    }
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'cloudSketch.apply', e, { throttleMs: 4000 });
  }

  return loadResult;
}

export function tryLoadEligibleRemoteSketch(
  deps: Pick<CreateCloudSyncSketchRoomOpsDeps, 'App' | 'clientId'>,
  state: CloudSyncSketchRoomMutableState,
  parsed: ParsedCloudSketchPayload
): LoadRemoteSketchResult | null {
  const remoteFingerprint = resolveCloudSketchPayloadFingerprint(parsed);
  if (remoteFingerprint && remoteFingerprint === state.lastSettledRemoteSketchFingerprint) {
    return null;
  }

  const local = captureSketchSnapshot(deps.App);
  const localHash = local ? local.hash : '';
  const eligibility = resolveCloudSketchPullEligibility({ parsed, localHash, clientId: deps.clientId });
  if (!eligibility.shouldApply) {
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
    return null;
  }

  const remoteSketch = asRecord<ProjectLoadInputLike>(parsed.sketch);
  if (!remoteSketch) {
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
    return null;
  }

  return {
    loadResult: loadRemoteSketch(deps.App, remoteSketch),
    remoteFingerprint,
  };
}

export function finishPulledSketchLoad(
  deps: Pick<CreateCloudSyncSketchRoomOpsDeps, 'App' | 'diag'>,
  state: CloudSyncSketchRoomMutableState,
  loaded: LoadRemoteSketchResult
): void {
  const { loadResult, remoteFingerprint } = loaded;
  if (loadResult.ok === true && loadResult.pending !== true) {
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
  }

  if (shouldToastCloudSketchApplied(loadResult)) {
    __wp_toast(deps.App, 'סקיצה חדשה התעדכנה', 'success');
    return;
  }

  if (loadResult.ok === false && loadResult.reason !== 'superseded') {
    deps.diag('sketch:pull:load-skipped', { reason: loadResult.reason || 'error' });
  }
}

export function runInitialCloudSketchCatchup(
  deps: Pick<CreateCloudSyncSketchRoomOpsDeps, 'App' | 'cfg' | 'diag'>,
  state: CloudSyncSketchRoomMutableState,
  rowUpdatedAt: string,
  parsed: ParsedCloudSketchPayload,
  loadEligible: (parsedPayload: ParsedCloudSketchPayload) => LoadRemoteSketchResult | null
): void {
  const initialCatchup = resolveInitialCloudSketchCatchupDecision({
    isSite2: isExplicitSite2Bundle(deps.App),
    autoLoadEnabled: deps.cfg.site2SketchInitialAutoLoad,
    maxAgeHours: deps.cfg.site2SketchInitialMaxAgeHours,
    rowUpdatedAt,
  });
  if (initialCatchup.diagEvent && initialCatchup.diagPayload) {
    deps.diag(initialCatchup.diagEvent, initialCatchup.diagPayload);
  }

  const remoteFingerprint = resolveCloudSketchPayloadFingerprint(parsed);
  if (!initialCatchup.shouldContinue) {
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
    return;
  }

  const loaded = loadEligible(parsed);
  if (!loaded) return;
  finishPulledSketchLoad(deps, state, loaded);
}

function rememberSettledFingerprintIfPresent(
  state: CloudSyncSketchRoomMutableState,
  fingerprint: string
): void {
  if (fingerprint) state.lastSettledRemoteSketchFingerprint = fingerprint;
}
