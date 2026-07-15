import type { AppContainer, ProjectLoadInputLike } from '../../../types';

import { flushHistoryPendingPushMaybe } from '../runtime/history_system_access.js';
import { asRecord } from '../runtime/record.js';
import { isExplicitSite2Bundle } from './cloud_sync_config.js';
import {
  buildCloudSketchProjectLoadError,
  type CloudSketchProjectLoadTerminalResult,
  loadCloudSketchProjectData,
  resolveCloudSketchPayloadFingerprint,
  resolveCloudSketchPullEligibility,
  resolveInitialCloudSketchCatchupDecision,
  settleCloudSketchProjectLoadAction,
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
  settled: Promise<CloudSketchProjectLoadTerminalResult>;
  remoteFingerprint: string;
};
export type EligibleRemoteSketchDecision =
  { kind: 'load'; loaded: LoadRemoteSketchResult } | { kind: 'settled' } | { kind: 'pending' };

export function loadRemoteSketch(
  App: AppContainer,
  remoteSketch: ProjectLoadInputLike
): Promise<CloudSketchProjectLoadTerminalResult> {
  try {
    return settleCloudSketchProjectLoadAction(loadCloudSketchProjectData(App, remoteSketch));
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'cloudSketch.apply', e, { throttleMs: 4000 });
    return Promise.resolve(buildCloudSketchProjectLoadError(e));
  }
}

export function tryLoadEligibleRemoteSketch(
  deps: Pick<CreateCloudSyncSketchRoomOpsDeps, 'App' | 'clientId'>,
  state: CloudSyncSketchRoomMutableState,
  parsed: ParsedCloudSketchPayload
): EligibleRemoteSketchDecision {
  const remoteFingerprint = resolveCloudSketchPayloadFingerprint(parsed);
  if (remoteFingerprint && remoteFingerprint === state.lastSettledRemoteSketchFingerprint) {
    return { kind: 'settled' };
  }
  if (remoteFingerprint && state.pendingRemoteSketchFingerprints.has(remoteFingerprint)) {
    return { kind: 'pending' };
  }

  const local = captureSketchSnapshot(deps.App);
  const localHash = local ? local.hash : '';
  const eligibility = resolveCloudSketchPullEligibility({ parsed, localHash, clientId: deps.clientId });
  if (!eligibility.shouldApply) {
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
    return { kind: 'settled' };
  }

  const remoteSketch = asRecord<ProjectLoadInputLike>(parsed.sketch);
  if (!remoteSketch) {
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
    return { kind: 'settled' };
  }

  if (remoteFingerprint) state.pendingRemoteSketchFingerprints.add(remoteFingerprint);
  try {
    return {
      kind: 'load',
      loaded: {
        settled: loadRemoteSketch(deps.App, remoteSketch),
        remoteFingerprint,
      },
    };
  } catch (error) {
    if (remoteFingerprint) state.pendingRemoteSketchFingerprints.delete(remoteFingerprint);
    throw error;
  }
}

export async function finishPulledSketchLoad(
  deps: Pick<CreateCloudSyncSketchRoomOpsDeps, 'App' | 'diag'>,
  state: CloudSyncSketchRoomMutableState,
  loaded: LoadRemoteSketchResult
): Promise<boolean> {
  const { remoteFingerprint } = loaded;
  let loadResult: CloudSketchProjectLoadTerminalResult;
  try {
    loadResult = await loaded.settled;
  } catch (error) {
    loadResult = buildCloudSketchProjectLoadError(error);
  } finally {
    if (remoteFingerprint) state.pendingRemoteSketchFingerprints.delete(remoteFingerprint);
  }

  if (loadResult.ok === true) {
    try {
      flushHistoryPendingPushMaybe(deps.App, {});
    } catch (e) {
      _cloudSyncReportNonFatal(deps.App, 'cloudSketch.flushAfterPull', e, { throttleMs: 4000 });
    }
    rememberSettledFingerprintIfPresent(state, remoteFingerprint);
  }

  if (shouldToastCloudSketchApplied(loadResult)) {
    __wp_toast(deps.App, 'סקיצה חדשה התעדכנה', 'success');
    return true;
  }

  if (loadResult.ok === false && loadResult.reason !== 'superseded') {
    deps.diag('sketch:pull:load-skipped', { reason: loadResult.reason || 'error' });
  }
  return false;
}

export function runInitialCloudSketchCatchup(
  deps: Pick<CreateCloudSyncSketchRoomOpsDeps, 'App' | 'cfg' | 'diag'>,
  state: CloudSyncSketchRoomMutableState,
  rowUpdatedAt: string,
  parsed: ParsedCloudSketchPayload,
  loadEligible: (parsedPayload: ParsedCloudSketchPayload) => EligibleRemoteSketchDecision
): Promise<boolean> {
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
    return Promise.resolve(true);
  }

  const decision = loadEligible(parsed);
  if (decision.kind === 'settled') return Promise.resolve(true);
  if (decision.kind === 'pending') return Promise.resolve(false);
  return finishPulledSketchLoad(deps, state, decision.loaded);
}

function rememberSettledFingerprintIfPresent(
  state: CloudSyncSketchRoomMutableState,
  fingerprint: string
): void {
  if (fingerprint) state.lastSettledRemoteSketchFingerprint = fingerprint;
}
