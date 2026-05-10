import type { AppContainer, UnknownRecord } from '../../../types';

import { requestKernelBuilderBuild } from './kernel_builder_request_policy.js';
import { scheduleAutosaveViaService } from '../runtime/autosave_access.js';

export interface KernelStateKernelConfigBatchFlags extends UnknownRecord {
  noBuild: boolean;
  noAutosave: boolean;
  noPersist: boolean;
  noHistory: boolean;
  immediate: boolean;
  force: boolean;
}

export function createKernelStateKernelConfigBatchFlags(): KernelStateKernelConfigBatchFlags {
  return {
    noBuild: false,
    noAutosave: false,
    noPersist: false,
    noHistory: false,
    immediate: false,
    force: false,
  };
}

export function readKernelConfigPatchSource(meta: UnknownRecord, defaultSource = 'config'): string {
  return meta.source != null ? String(meta.source) : defaultSource;
}

export function readKernelConfigPatchForce(meta: UnknownRecord): boolean {
  return Boolean(meta.forceBuild) || Boolean(meta.force);
}

export function ensureKernelStateKernelConfigBatchFlags(
  batch: UnknownRecord | null
): KernelStateKernelConfigBatchFlags | null {
  if (!batch) return null;
  const next = (batch.flags ||
    createKernelStateKernelConfigBatchFlags()) as KernelStateKernelConfigBatchFlags;
  batch.flags = next;
  return next;
}

export function mergeKernelStateKernelConfigBatchMeta(
  batch: UnknownRecord | null,
  source: string,
  meta: UnknownRecord,
  force: boolean
): boolean {
  if (!batch || Number(batch.depth ?? 0) <= 0) return false;
  batch.lastSource = String(source || batch.lastSource || 'config');
  const flags = ensureKernelStateKernelConfigBatchFlags(batch);
  if (!flags) return false;
  flags.noBuild = flags.noBuild || Boolean(meta.noBuild);
  flags.noAutosave = flags.noAutosave || Boolean(meta.noAutosave);
  flags.noPersist = flags.noPersist || Boolean(meta.noPersist);
  flags.noHistory = flags.noHistory || Boolean(meta.noHistory);
  flags.immediate = flags.immediate || Boolean(meta.immediate);
  flags.force = flags.force || force;
  return true;
}

export function requestKernelStateKernelConfigBuild(
  App: AppContainer,
  meta: UnknownRecord,
  source: string,
  force: boolean
): void {
  requestKernelBuilderBuild(App, meta, {
    source,
    immediate: !!meta.immediate,
    force,
  });
}

export function commitKernelStateKernelConfigPatch(
  kernelConfigState: UnknownRecord | null | undefined,
  source: string,
  meta: UnknownRecord,
  force: boolean
): void {
  if (!kernelConfigState || typeof kernelConfigState.commit !== 'function') return;
  kernelConfigState.commit({
    source,
    noBuild: meta.noBuild,
    noPersist: meta.noPersist,
    noAutosave: meta.noAutosave,
    noHistory: meta.noHistory,
    immediate: meta.immediate,
    force,
  });
}

export function scheduleKernelStateKernelConfigAutosave(App: AppContainer, meta: UnknownRecord): void {
  if (meta.noAutosave || meta.noPersist) return;
  scheduleAutosaveViaService(App);
}
