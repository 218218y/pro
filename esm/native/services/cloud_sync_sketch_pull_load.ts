import type {
  AppContainer,
  CloudSyncSketchState,
  ProjectIoLoadResultLike,
  ProjectLoadInputLike,
} from '../../../types';

import { loadProjectDataResultViaService } from '../runtime/project_io_access.js';
import { parseIsoTimeMs } from './cloud_sync_support.js';
import { stableSerializeCloudSyncValue } from './cloud_sync_support_shared.js';

export type CloudSketchInitialCatchupDecision = {
  shouldContinue: boolean;
  diagEvent?: 'sketch:init-catchup:apply' | 'sketch:init-catchup:skip-stale';
  diagPayload?: {
    updatedAt: string;
    ageMs: number;
    maxAgeMs: number;
    site: 'site2';
  };
};

export type CloudSketchPullEligibility = {
  shouldApply: boolean;
  reason?: 'missing-sketch' | 'same-hash' | 'same-client';
};

export function resolveInitialCloudSketchCatchupDecision(args: {
  isSite2: boolean;
  autoLoadEnabled: boolean;
  maxAgeHours: number;
  rowUpdatedAt: string;
  nowMs?: number;
}): CloudSketchInitialCatchupDecision {
  const isSite2 = args.isSite2 === true;
  const autoLoadEnabled = args.autoLoadEnabled === true;
  if (!isSite2 || !autoLoadEnabled) return { shouldContinue: false };

  const rowUpdatedAt = typeof args.rowUpdatedAt === 'string' ? args.rowUpdatedAt.trim() : '';
  if (!rowUpdatedAt) return { shouldContinue: false };

  const nowMs = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now();
  const maxAgeMs = Math.max(0, Math.round((Number(args.maxAgeHours) || 0) * 3600 * 1000));
  const updatedMs = parseIsoTimeMs(rowUpdatedAt);
  const ageMs = updatedMs > 0 ? Math.max(0, nowMs - updatedMs) : Number.POSITIVE_INFINITY;
  if (!(updatedMs > 0) || ageMs > maxAgeMs) {
    return {
      shouldContinue: false,
      diagEvent: 'sketch:init-catchup:skip-stale',
      diagPayload: {
        updatedAt: rowUpdatedAt,
        ageMs,
        maxAgeMs,
        site: 'site2',
      },
    };
  }

  return {
    shouldContinue: true,
    diagEvent: 'sketch:init-catchup:apply',
    diagPayload: {
      updatedAt: rowUpdatedAt,
      ageMs,
      maxAgeMs,
      site: 'site2',
    },
  };
}

export function resolveCloudSketchPayloadFingerprint(parsed: CloudSyncSketchState): string {
  const remoteHash = typeof parsed.hash === 'string' ? parsed.hash.trim() : '';
  if (remoteHash) return `hash:${remoteHash}`;

  const sketch = parsed.sketch;
  if (!sketch || typeof sketch !== 'object') return '';

  try {
    return `sketch:${stableSerializeCloudSyncValue(sketch, { undefinedValue: 'null', bigintValue: 'quoted-n', otherPrimitiveValue: 'type-label' })}`;
  } catch {
    return '';
  }
}

export function resolveCloudSketchPullEligibility(args: {
  parsed: CloudSyncSketchState;
  localHash: string;
  clientId: string;
}): CloudSketchPullEligibility {
  const parsed = args.parsed;
  if (!parsed.sketch || typeof parsed.sketch !== 'object')
    return { shouldApply: false, reason: 'missing-sketch' };

  const remoteHash = typeof parsed.hash === 'string' ? parsed.hash.trim() : '';
  const localHash = typeof args.localHash === 'string' ? args.localHash.trim() : '';
  if (remoteHash && localHash && remoteHash === localHash) return { shouldApply: false, reason: 'same-hash' };

  const remoteBy = typeof parsed.by === 'string' ? parsed.by.trim() : '';
  const clientId = typeof args.clientId === 'string' ? args.clientId.trim() : '';
  if (remoteBy && clientId && remoteBy === clientId) return { shouldApply: false, reason: 'same-client' };

  return { shouldApply: true };
}

export function loadCloudSketchProjectData(
  App: AppContainer,
  sketch: ProjectLoadInputLike
): ProjectIoLoadResultLike {
  return loadProjectDataResultViaService(
    App,
    sketch,
    { toast: false, meta: { source: 'cloudSketch.pull' } },
    'cloud-sketch-load',
    '[WardrobePro] Cloud sketch load failed.'
  );
}

export function shouldToastCloudSketchApplied(result: ProjectIoLoadResultLike | null | undefined): boolean {
  return !!result && result.ok === true && result.pending !== true;
}
