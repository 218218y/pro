import type { UnknownRecord } from '../../../types';

import { asRecord } from '../runtime/record.js';

export type KernelBuilderRequestMeta = UnknownRecord | null | undefined;

export type KernelBuilderRequestPolicyOpts = {
  source?: string;
  reason?: string;
  immediate?: boolean;
  force?: boolean;
};

export type ResolvedKernelBuilderRequestPolicy = {
  metaRecord: UnknownRecord | null;
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
  const metaRecord = asRecord<UnknownRecord>(meta) || {};
  return (
    readKernelBuilderRequestString(metaRecord.source) ||
    readKernelBuilderRequestString(metaRecord.reason) ||
    defaultSource
  );
}

export function readKernelBuilderRequestForce(meta: KernelBuilderRequestMeta, defaultForce = false): boolean {
  const metaRecord = asRecord<UnknownRecord>(meta) || {};
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
  const metaRecord = asRecord<UnknownRecord>(meta) || {};
  return readKernelBuilderRequestBoolean(metaRecord.immediate) ?? defaultImmediate;
}

export function shouldRequestKernelBuilderBuild(
  meta: KernelBuilderRequestMeta,
  defaultForce = false
): boolean {
  const metaRecord = asRecord<UnknownRecord>(meta) || {};
  const force = readKernelBuilderRequestForce(metaRecord, defaultForce);
  if (force) return true;
  return !readKernelBuilderRequestBoolean(metaRecord.noBuild);
}

export function resolveKernelBuilderRequestPolicy(
  meta: KernelBuilderRequestMeta,
  opts?: KernelBuilderRequestPolicyOpts | null
): ResolvedKernelBuilderRequestPolicy {
  const metaRecord = asRecord<UnknownRecord>(meta) || null;
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
