// Builder Build Context (ESM)
//
// Purpose:
// - Compute derived values once (dims/materials/layout/etc.)
// - Pass a single `ctx` object through pipelines instead of long arg lists.
//
// This is intentionally lightweight (plain object) and can be extended.

import type {
  BuildContextLike,
  BuildCtxCreateFnsLike,
  BuildCtxDimsLike,
  BuildCtxFlagsLike,
  BuildCtxFnsLike,
  BuildCtxHingedLike,
  BuildCtxLayoutLike,
  BuildCtxMaterialsLike,
  BuildCtxResolversLike,
  BuildCtxStringsLike,
  UnknownRecord,
} from '../../../types';

import { asRecord } from '../runtime/record.js';

export const BUILD_CTX_V1 = 'WardrobePro.BuildContext.v1';

function ensureFlagsSection(ctx: BuildContextLike): BuildCtxFlagsLike {
  const current = asRecord<BuildCtxFlagsLike>(ctx.flags);
  if (current) return current;
  const next: BuildCtxFlagsLike = {};
  ctx.flags = next;
  return next;
}

function ensureDimsSection(ctx: BuildContextLike): BuildCtxDimsLike {
  const current = asRecord<BuildCtxDimsLike>(ctx.dims);
  if (current) return current;
  const next: BuildCtxDimsLike = {};
  ctx.dims = next;
  return next;
}

function ensureStringsSection(ctx: BuildContextLike): BuildCtxStringsLike {
  const current = asRecord<BuildCtxStringsLike>(ctx.strings);
  if (current) return current;
  const next: BuildCtxStringsLike = {};
  ctx.strings = next;
  return next;
}

function ensureLayoutSection(ctx: BuildContextLike): BuildCtxLayoutLike {
  const current = asRecord<BuildCtxLayoutLike>(ctx.layout);
  if (current) return current;
  const next: BuildCtxLayoutLike = {};
  ctx.layout = next;
  return next;
}

function ensureMaterialsSection(ctx: BuildContextLike): BuildCtxMaterialsLike {
  const current = asRecord<BuildCtxMaterialsLike>(ctx.materials);
  if (current) return current;
  const next: BuildCtxMaterialsLike = {};
  ctx.materials = next;
  return next;
}

function ensureCreateSection(ctx: BuildContextLike): BuildCtxCreateFnsLike {
  const current = asRecord<BuildCtxCreateFnsLike>(ctx.create);
  if (current) return current;
  const next: BuildCtxCreateFnsLike = {};
  ctx.create = next;
  return next;
}

function ensureResolversSection(ctx: BuildContextLike): BuildCtxResolversLike {
  const current = asRecord<BuildCtxResolversLike>(ctx.resolvers);
  if (current) return current;
  const next: BuildCtxResolversLike = {};
  ctx.resolvers = next;
  return next;
}

function ensureHingedSection(ctx: BuildContextLike): BuildCtxHingedLike {
  const current = asRecord<BuildCtxHingedLike>(ctx.hinged);
  if (current) return current;
  const next: BuildCtxHingedLike = {};
  ctx.hinged = next;
  return next;
}

function ensureFnsSection(ctx: BuildContextLike): BuildCtxFnsLike {
  const current = asRecord<BuildCtxFnsLike>(ctx.fns);
  if (current) return current;
  const next: BuildCtxFnsLike = {};
  ctx.fns = next;
  return next;
}

function normalizeBuildContextSections(ctx: BuildContextLike): BuildContextLike {
  // Non-frozen on purpose: some pipelines push into ops arrays.
  ensureFlagsSection(ctx);
  ensureDimsSection(ctx);
  ensureStringsSection(ctx);
  ensureLayoutSection(ctx);
  ensureMaterialsSection(ctx);
  ensureCreateSection(ctx);
  ensureResolversSection(ctx);
  ensureHingedSection(ctx);
  ensureFnsSection(ctx);
  return ctx;
}

/**
 * @param {unknown} x
 * @returns {x is BuildContextLike}
 */
export function isBuildContext(x: unknown): x is BuildContextLike {
  const rec = asRecord<BuildContextLike>(x);
  return !!(rec && rec.__kind === BUILD_CTX_V1);
}

/**
 * @param {UnknownRecord | null | undefined} init
 * @returns {BuildContextLike}
 */
export function createBuildContext(init: UnknownRecord | null | undefined): BuildContextLike {
  const base = asRecord<UnknownRecord>(init) ?? {};
  const ctx: BuildContextLike = Object.assign(base, { __kind: BUILD_CTX_V1 });
  return normalizeBuildContextSections(ctx);
}
