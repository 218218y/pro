import type { AppContainer, WardrobeProRendererProgramSnapshot } from '../../../types/index.js';

import { markPerfPoint } from './perf_runtime_core.js';
import { getRendererProgramSnapshot } from './perf_runtime_render_snapshot.js';
import { ensureRenderNamespace } from './render_access.js';

type BuildProgramLifecycleProbe = {
  executionId: string;
  reason: string;
  p0: WardrobeProRendererProgramSnapshot | null;
  p1: WardrobeProRendererProgramSnapshot | null;
};

const probesByApp = new WeakMap<object, Map<string, BuildProgramLifecycleProbe>>();
const pendingFirstRenderByApp = new WeakMap<object, string[]>();

function getStableProbeOwner(App: AppContainer): object {
  return ensureRenderNamespace(App) as object;
}

function getProbeMap(App: AppContainer): Map<string, BuildProgramLifecycleProbe> {
  const key = getStableProbeOwner(App);
  let probes = probesByApp.get(key);
  if (!probes) {
    probes = new Map();
    probesByApp.set(key, probes);
  }
  return probes;
}

function getPendingFirstRender(App: AppContainer): string[] {
  const key = getStableProbeOwner(App);
  let pending = pendingFirstRenderByApp.get(key);
  if (!pending) {
    pending = [];
    pendingFirstRenderByApp.set(key, pending);
  }
  return pending;
}

export function beginBuildProgramLifecycleProbe(
  App: AppContainer,
  executionId: string,
  reason: string
): void {
  getProbeMap(App).set(executionId, {
    executionId,
    reason,
    p0: getRendererProgramSnapshot(App),
    p1: null,
  });
}

export function markBuildProgramLifecyclePreRender(App: AppContainer, executionId: string): void {
  const probe = getProbeMap(App).get(executionId);
  if (!probe) return;
  if (probe.p1) return;
  probe.p1 = getRendererProgramSnapshot(App);
  const pending = getPendingFirstRender(App);
  if (!pending.includes(executionId)) pending.push(executionId);
}

export function abortBuildProgramLifecycleProbe(App: AppContainer, executionId: string): void {
  getProbeMap(App).delete(executionId);
  const pending = getPendingFirstRender(App);
  const index = pending.indexOf(executionId);
  if (index >= 0) pending.splice(index, 1);
}

export function completeBuildProgramLifecycleAfterRender(App: AppContainer): void {
  const pending = getPendingFirstRender(App);
  if (!pending.length) return;

  // Several synchronous builds may coalesce into one presented frame. Only the
  // latest execution owns that first render; older probes did not get an
  // independently observable presentation and must not receive misleading P2s.
  const executionId = pending[pending.length - 1];
  if (!executionId) return;
  const supersededExecutionIds = pending.slice(0, -1);
  pending.length = 0;

  const probes = getProbeMap(App);
  for (const supersededId of supersededExecutionIds) probes.delete(supersededId);
  const probe = probes.get(executionId);
  if (!probe) return;
  probes.delete(executionId);

  markPerfPoint(App, 'builder.program-lifecycle', {
    detail: {
      executionId: probe.executionId,
      reason: probe.reason,
      p0: probe.p0,
      p1: probe.p1,
      p2: getRendererProgramSnapshot(App),
      supersededExecutionIds,
    },
  });
}
