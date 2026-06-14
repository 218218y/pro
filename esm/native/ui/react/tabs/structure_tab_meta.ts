import type { ActionMetaLike, MetaActionsNamespaceLike } from '../../../../../types';

export type StructureMetaAccess = Pick<
  MetaActionsNamespaceLike,
  'uiOnlyImmediate' | 'noBuild' | 'noHistory' | 'noHistoryImmediate'
> &
  Partial<Pick<MetaActionsNamespaceLike, 'noBuildImmediate'>>;

function normalizeStructureTabMetaSource(source: string, profile: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error(`[WardrobePro] Structure Tab ${profile} meta requires a source.`);
  }
  return normalized;
}

export function withImmediate(meta: ActionMetaLike): ActionMetaLike {
  return { ...meta, immediate: true };
}

function withStructureTabSource(meta: ActionMetaLike, source: string): ActionMetaLike {
  return { ...meta, source };
}

function withStructureTabImmediateSource(meta: ActionMetaLike, source: string): ActionMetaLike {
  return { ...meta, source, immediate: true };
}

export function createStructureTabRecomputeWriteMeta(
  source: string,
  baseMeta?: ActionMetaLike
): ActionMetaLike {
  const normalized = normalizeStructureTabMetaSource(source, 'recompute-write');
  return {
    ...(baseMeta || {}),
    source: normalized,
    immediate: true,
    noBuild: true,
  };
}

export function createStructureTabNoBuildImmediateMeta(
  meta: StructureMetaAccess,
  source: string
): ActionMetaLike {
  const normalized = normalizeStructureTabMetaSource(source, 'no-build immediate');
  if (typeof meta.noBuildImmediate === 'function') {
    return withStructureTabImmediateSource(meta.noBuildImmediate(normalized), normalized);
  }
  return withStructureTabImmediateSource(
    meta.noBuild({ immediate: true, source: normalized }, normalized),
    normalized
  );
}

export function createStructureTabNoBuildNoHistoryMeta(
  meta: StructureMetaAccess,
  source: string,
  baseMeta?: ActionMetaLike
): ActionMetaLike {
  const normalized = normalizeStructureTabMetaSource(source, 'no-build no-history');
  return withStructureTabSource(meta.noBuild(meta.noHistory(baseMeta, normalized), normalized), normalized);
}

export function createStructureTabNoBuildNoHistoryImmediateMeta(
  meta: StructureMetaAccess,
  source: string
): ActionMetaLike {
  const normalized = normalizeStructureTabMetaSource(source, 'no-build no-history immediate');
  if (typeof meta.noHistoryImmediate === 'function') {
    return withStructureTabImmediateSource(
      meta.noBuild(meta.noHistoryImmediate(normalized), normalized),
      normalized
    );
  }
  return withStructureTabImmediateSource(
    createStructureTabNoBuildNoHistoryMeta(meta, normalized, { immediate: true, source: normalized }),
    normalized
  );
}

export function createStructureTabUiOnlyImmediateMeta(
  meta: Pick<MetaActionsNamespaceLike, 'uiOnlyImmediate'>,
  source: string
): ActionMetaLike {
  const normalized = normalizeStructureTabMetaSource(source, 'ui-only immediate');
  return withStructureTabImmediateSource(meta.uiOnlyImmediate(normalized), normalized);
}

export function createStructureTabStructuralCommitMeta(
  meta: StructureMetaAccess,
  source: string,
  options: { uiOnly?: boolean } = {}
): ActionMetaLike {
  return options.uiOnly
    ? createStructureTabUiOnlyImmediateMeta(meta, source)
    : createStructureTabNoBuildImmediateMeta(meta, source);
}
