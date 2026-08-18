import type { ActionMetaLike } from '../../../types';

export type KernelBuilderRequestMeta = ActionMetaLike | null | undefined;

export type KernelBuilderRequestPolicyOpts = {
  source?: string;
  reason?: string;
  immediate?: boolean;
  force?: boolean;
};

export type ResolvedKernelBuilderRequestPolicy = {
  metaRecord: ActionMetaLike | null;
  source: string;
  reason: string;
  immediate: boolean;
  force: boolean;
  shouldRequestBuild: boolean;
};

function readKernelBuilderRequestString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function readKernelBuilderRequestBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function readKernelBuilderRequestSource(
  meta: KernelBuilderRequestMeta,
  defaultSource = 'kernel'
): string {
  const metaRecord = meta || {};
  return (
    readKernelBuilderRequestString(metaRecord.source) ||
    readKernelBuilderRequestString(metaRecord.reason) ||
    defaultSource
  );
}

export function readKernelBuilderRequestForce(meta: KernelBuilderRequestMeta, defaultForce = false): boolean {
  const metaRecord = meta || {};
  return (
    readKernelBuilderRequestBoolean(metaRecord.force) ??
    readKernelBuilderRequestBoolean(metaRecord.forceBuild) ??
    defaultForce
  );
}

export function readKernelBuilderRequestImmediate(
  meta: KernelBuilderRequestMeta,
  defaultImmediate = false
): boolean {
  const metaRecord = meta || {};
  return readKernelBuilderRequestBoolean(metaRecord.immediate) ?? defaultImmediate;
}

export function shouldRequestKernelBuilderBuild(
  meta: KernelBuilderRequestMeta,
  defaultForce = false
): boolean {
  const metaRecord = meta || {};
  const force = readKernelBuilderRequestForce(metaRecord, defaultForce);
  if (force) return true;
  return !readKernelBuilderRequestBoolean(metaRecord.noBuild);
}

export function resolveKernelBuilderRequestPolicy(
  meta: KernelBuilderRequestMeta,
  opts?: KernelBuilderRequestPolicyOpts | null
): ResolvedKernelBuilderRequestPolicy {
  const metaRecord = meta || null;
  const source = readKernelBuilderRequestSource(metaRecord, opts?.source || 'kernel');
  const reason = opts?.reason || source;
  const immediate = readKernelBuilderRequestImmediate(metaRecord, !!opts?.immediate);
  const force = readKernelBuilderRequestForce(metaRecord, !!opts?.force);

  return {
    metaRecord,
    source,
    reason,
    immediate,
    force,
    shouldRequestBuild: shouldRequestKernelBuilderBuild(metaRecord, force),
  };
}
