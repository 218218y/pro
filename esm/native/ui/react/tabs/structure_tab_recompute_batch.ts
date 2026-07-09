import type { ActionMetaLike, AppContainer, UnknownRecord } from '../../../../../types';

import { getUiSnapshot, runHistoryBatch } from '../actions/store_actions.js';
import {
  createStructuralModulesRecomputeOpts,
  patchViaActions,
  runAppStructuralModulesRecompute,
} from '../../../services/api.js';
import type { StructureRecomputeOpts } from './structure_tab_core_contracts.js';

export type StructureUiOverrideMerge = (
  baseUi: UnknownRecord | null | undefined,
  uiPatch: UnknownRecord | null | undefined
) => UnknownRecord | null;

export type StructurePatchRecomputeBatchArgs<TPatch extends UnknownRecord = UnknownRecord> = {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch?: TPatch | null;
  statePatch?: UnknownRecord | null;
  mutate?: () => void;
  recomputeOpts?: StructureRecomputeOpts;
  mergeUiOverride?: StructureUiOverrideMerge;
  buildTiming?: StructureRecomputeBuildTiming;
  forceBuild?: boolean;
};

export const STRUCTURE_RECOMPUTE_OPTS = createStructuralModulesRecomputeOpts() as StructureRecomputeOpts;

export type StructureRecomputeBuildTiming = 'immediate' | 'coalesced';

export type StructureRecomputeBuildDefaults = {
  source: string;
  force: boolean;
  immediate?: false;
};

export function createStructureRecomputeOpts(): StructureRecomputeOpts {
  return createStructuralModulesRecomputeOpts() as StructureRecomputeOpts;
}

function readStructureRecomputeBuildTiming(
  buildTiming: StructureRecomputeBuildTiming | null | undefined
): StructureRecomputeBuildTiming {
  if (buildTiming == null) return 'immediate';
  if (buildTiming === 'immediate' || buildTiming === 'coalesced') return buildTiming;
  throw new Error(`[WardrobePro] Unknown structure recompute build timing: ${String(buildTiming)}`);
}

function readStructureRecomputeBuildForce(forceBuild: boolean | null | undefined): boolean {
  if (forceBuild == null) return true;
  if (typeof forceBuild === 'boolean') return forceBuild;
  throw new Error(`[WardrobePro] Unknown structure recompute build force: ${String(forceBuild)}`);
}

export function createStructureRecomputeBuildDefaults(
  source: string,
  buildTiming?: StructureRecomputeBuildTiming | null,
  forceBuild?: boolean | null
): StructureRecomputeBuildDefaults {
  const timing = readStructureRecomputeBuildTiming(buildTiming);
  const defaults: StructureRecomputeBuildDefaults = {
    source,
    force: readStructureRecomputeBuildForce(forceBuild),
  };
  if (timing === 'coalesced') defaults.immediate = false;
  return defaults;
}

export function mergeStructureUiOverride(
  baseUi: UnknownRecord | null | undefined,
  uiPatch: UnknownRecord | null | undefined
): UnknownRecord | null {
  if (!uiPatch || typeof uiPatch !== 'object') {
    return baseUi && typeof baseUi === 'object' ? { ...baseUi } : null;
  }

  const base = baseUi && typeof baseUi === 'object' ? baseUi : {};
  const out: UnknownRecord = { ...base, ...uiPatch };
  const baseRaw = base.raw && typeof base.raw === 'object' ? (base.raw as UnknownRecord) : null;
  const patchRaw = uiPatch.raw && typeof uiPatch.raw === 'object' ? (uiPatch.raw as UnknownRecord) : null;
  if (baseRaw || patchRaw) out.raw = { ...baseRaw, ...patchRaw };
  return out;
}

function applyStatePatchOrMutation(
  app: AppContainer,
  statePatch: UnknownRecord | null | undefined,
  meta: ActionMetaLike,
  mutate: (() => void) | undefined
): void {
  const rootPatch = statePatch && typeof statePatch === 'object' ? { ...statePatch } : null;
  const applied = rootPatch ? patchViaActions(app, rootPatch, meta) : false;
  if (!applied && typeof mutate === 'function') {
    mutate();
  }
}

export function runStructurePatchRecomputeBatch<TPatch extends UnknownRecord = UnknownRecord>(
  args: StructurePatchRecomputeBatchArgs<TPatch>
): void {
  const {
    app,
    source,
    meta,
    uiPatch,
    statePatch,
    mutate,
    recomputeOpts = createStructureRecomputeOpts(),
    mergeUiOverride = mergeStructureUiOverride,
    buildTiming,
    forceBuild,
  } = args;

  runHistoryBatch(
    app,
    () => {
      applyStatePatchOrMutation(app, statePatch, meta, mutate);
      const override = mergeUiOverride(getUiSnapshot(app), uiPatch ?? null);
      runAppStructuralModulesRecompute(
        app,
        override,
        null,
        createStructureRecomputeBuildDefaults(source, buildTiming, forceBuild),
        recomputeOpts,
        {}
      );
    },
    meta
  );
}

export function runStructureRecomputeFromUi(
  app: AppContainer,
  rawPatch: UnknownRecord | null,
  meta: ActionMetaLike,
  opts: StructureRecomputeOpts = STRUCTURE_RECOMPUTE_OPTS
): void {
  runAppStructuralModulesRecompute(app, rawPatch, meta, null, opts, {});
}
