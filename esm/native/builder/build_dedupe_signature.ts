import type { BuildStateLike } from '../../../types/index.js';

import { asRecord } from '../runtime/record.js';

export type BuildDedupeSignatureReader = (state: unknown) => unknown;

type AnyRecord = Record<string, unknown>;

type BuildDedupeParts = {
  signature: unknown;
  activeId: string;
  forceBuild: boolean;
};

function readRecord(value: unknown): AnyRecord | null {
  return asRecord<AnyRecord>(value);
}

export function readTransientBuildUiFlag(state: unknown, key: string): unknown {
  const stateRec = readRecord(state);
  const uiRec = readRecord(stateRec?.ui);
  return uiRec ? uiRec[key] : undefined;
}

export function normalizeBuildDedupeScalar(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return `str:${value}`;
  if (typeof value === 'number') return `num:${Number.isFinite(value) ? value : 'NaN'}`;
  if (typeof value === 'boolean') return value ? 'bool:1' : 'bool:0';
  if (typeof value === 'bigint') return `big:${String(value)}`;
  try {
    const json = JSON.stringify(value);
    if (typeof json === 'string' && json) return `json:${json}`;
  } catch {
    // fall through
  }
  return `repr:${String(value)}`;
}

export function createBuildDedupeSignature(parts: BuildDedupeParts): unknown {
  const activeId = parts.activeId || '';
  if (!activeId && !parts.forceBuild) return parts.signature;
  const signaturePart = normalizeBuildDedupeScalar(parts.signature);
  return `sig:${signaturePart}|active:${activeId}|force:${parts.forceBuild ? '1' : '0'}`;
}

export function readBuildDedupeSignatureFromState(
  state: BuildStateLike | null | undefined,
  readSignature: BuildDedupeSignatureReader
): unknown {
  const signature = state == null ? null : readSignature(state);
  const activeIdRaw = readTransientBuildUiFlag(state, '__activeId');
  const activeId = activeIdRaw == null ? '' : String(activeIdRaw);
  const forceBuild = !!readTransientBuildUiFlag(state, 'forceBuild');
  return createBuildDedupeSignature({ signature, activeId, forceBuild });
}

export function readBuildDedupeSignatureFromArgs(
  args: readonly unknown[],
  readSignature: BuildDedupeSignatureReader
): unknown {
  if (!Array.isArray(args) || args.length === 0) return null;
  return readBuildDedupeSignatureFromState(args[0] as BuildStateLike | null | undefined, readSignature);
}
