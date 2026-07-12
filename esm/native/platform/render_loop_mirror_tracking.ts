import type { AppContainer, UnknownRecord } from '../../../types';

import { ensureRenderMetaArray } from '../runtime/render_access.js';
import { readConfigNumberLooseFromApp } from '../runtime/config_selectors.js';
import {
  asRecordOrNull,
  incrementRenderSlotCounter,
  readFiniteSlotNumber,
  type MirrorDriverDeps,
  type MirrorFramePolicy,
} from './render_loop_mirror_shared.js';

export type MirrorTrackingState = {
  mirrors: UnknownRecord[];
  hasMirror: boolean;
  deferredForBudget: boolean;
};

function compactTrackedMirrors(mirrors: UnknownRecord[]): void {
  const seen = new Set<UnknownRecord>();
  let writeIndex = 0;
  for (let index = 0; index < mirrors.length; index += 1) {
    const mirror = asRecordOrNull(mirrors[index]);
    if (!mirror || seen.has(mirror)) continue;
    if (typeof mirror['parent'] === 'undefined') continue;
    seen.add(mirror);
    mirrors[writeIndex++] = mirror;
  }
  if (mirrors.length !== writeIndex) mirrors.length = writeIndex;
}

export function resolveTrackedMirrorState(
  app: AppContainer,
  deps: Pick<MirrorDriverDeps, 'isTaggedMirrorSurface' | 'getRenderSlot' | 'setRenderSlot'>,
  policy: MirrorFramePolicy
): MirrorTrackingState {
  const mirrors = ensureRenderMetaArray<UnknownRecord>(app, 'mirrors');
  const trackedCountBeforePrune = mirrors.length;
  const lastPrune = readFiniteSlotNumber(deps, app, '__mirrorTrackedPruneAtMs', -1);
  const shouldPrune =
    trackedCountBeforePrune > 0 && (policy.mirrorDirty || lastPrune < 0 || policy.nowMs - lastPrune >= 1500);

  const presenceKnown = !!deps.getRenderSlot<boolean>(app, '__mirrorPresenceKnown');
  const cachedPresence = !!deps.getRenderSlot<boolean>(app, '__mirrorPresenceHasMirror');
  const checkedAt = readFiniteSlotNumber(deps, app, '__mirrorPresenceCheckedAtMs', -1);
  const noMirrorRescanMs = Math.max(
    100,
    readConfigNumberLooseFromApp(app, 'MIRROR_NO_MIRROR_RESCAN_MS', 1200)
  );
  const shouldCheckPresence =
    !presenceKnown ||
    policy.mirrorDirty ||
    checkedAt < 0 ||
    (!cachedPresence && policy.nowMs - checkedAt >= noMirrorRescanMs);
  const canReuseTrackedPresence = presenceKnown && cachedPresence && trackedCountBeforePrune > 0;
  const shouldDefer =
    !policy.canRunInBudget && trackedCountBeforePrune > 0 && (shouldPrune || shouldCheckPresence);

  if (shouldDefer) {
    deps.setRenderSlot(app, '__mirrorBudgetDeferredAtMs', policy.nowMs);
    deps.setRenderSlot(app, '__mirrorWorkPending', true);
    incrementRenderSlotCounter(deps, app, '__mirrorBudgetDeferredCount');
    if (shouldPrune) incrementRenderSlotCounter(deps, app, '__mirrorPruneBudgetSkipCount');
    if (shouldCheckPresence) incrementRenderSlotCounter(deps, app, '__mirrorPresenceBudgetSkipCount');
    return { mirrors, hasMirror: false, deferredForBudget: true };
  }

  if (shouldPrune) {
    compactTrackedMirrors(mirrors);
    deps.setRenderSlot(app, '__mirrorTrackedPruneAtMs', policy.nowMs);
  }

  const trackedCount = mirrors.length;
  if (trackedCount === 0) {
    deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
    deps.setRenderSlot(app, '__mirrorPresenceHasMirror', false);
    deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
    deps.setRenderSlot(app, '__mirrorDirty', false);
    return { mirrors, hasMirror: false, deferredForBudget: false };
  }

  let hasMirror = !shouldCheckPresence && canReuseTrackedPresence;
  if (shouldCheckPresence) {
    for (let index = 0; index < mirrors.length; index += 1) {
      const mirror = asRecordOrNull(mirrors[index]);
      if (!mirror || !mirror['isMesh']) continue;
      if (!deps.isTaggedMirrorSurface(mirror)) continue;
      hasMirror = true;
      break;
    }
    deps.setRenderSlot(app, '__mirrorPresenceKnown', true);
    deps.setRenderSlot(app, '__mirrorPresenceHasMirror', hasMirror);
    deps.setRenderSlot(app, '__mirrorPresenceCheckedAtMs', policy.nowMs);
    if (!hasMirror) deps.setRenderSlot(app, '__mirrorDirty', false);
  } else if (presenceKnown && cachedPresence) {
    hasMirror = true;
  }

  return { mirrors, hasMirror, deferredForBudget: false };
}
