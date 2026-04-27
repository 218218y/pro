import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  AppContainer,
  BuilderActionsNamespaceLike,
  ModeActionsNamespaceLike,
  ModulesActionsLike,
  PatchPayload,
  RootStateLike,
  RuntimeActionsNamespaceLike,
  RuntimeSlicePatch,
  UiActionsNamespaceLike,
  UiSlicePatch,
  UnknownRecord,
} from '../../../types';

import {
  cloneCornerConfigurationListsSnapshot,
  cloneCornerConfigurationSnapshot,
} from '../features/modules_configuration/corner_cells_api.js';
import {
  cloneModulesConfigurationSnapshot,
  materializeTopModulesConfigurationFromUiConfig,
} from '../features/modules_configuration/modules_config_api.js';
import { hasBuildStateOverride, normMeta } from './state_api_shared.js';
import type { MetaNs } from './state_api_shared.js';
import { installStateApiRuntimeModeSurface } from './state_api_surface_runtime_mode.js';
import { installStateApiUiSurface } from './state_api_surface_ui.js';

export interface StateApiSurfaceNamespacesInstallContext {
  App: AppContainer;
  actions: ActionsNamespaceLike;
  metaActionsNs: MetaNs | null;
  uiNs: UiActionsNamespaceLike;
  runtimeNs: RuntimeActionsNamespaceLike;
  modeNs: ModeActionsNamespaceLike;
  builderNs: BuilderActionsNamespaceLike;
  modulesNs: ModulesActionsLike;
  dispatchCanonicalPatch(payload: PatchPayload, meta: ActionMetaLike): unknown;
  commitUiPatch(patch: UiSlicePatch, meta: ActionMetaLike): unknown;
  commitRuntimePatch(patch: RuntimeSlicePatch, meta: ActionMetaLike): unknown;
  commitModePatch(patch: Record<string, unknown>, meta: ActionMetaLike): unknown;
  callStoreWriter(
    methodName: 'setUi' | 'setRuntime' | 'setMode' | 'setModePatch' | 'setConfig' | 'setMeta',
    ...args: readonly unknown[]
  ): unknown;
  readRootSnapshot(): RootStateLike | null;
  asObj<T extends object = UnknownRecord>(value: unknown): T | null;
  isObj(value: unknown): value is UnknownRecord;
  safeCall(fn: () => unknown): unknown;
}

export function installStateApiSurfaceNamespaces(ctx: StateApiSurfaceNamespacesInstallContext): void {
  const { actions, builderNs, modulesNs, dispatchCanonicalPatch, readRootSnapshot } = ctx;

  const canonicalizeBuilderState = (value: unknown): UnknownRecord => {
    const base = ctx.asObj(readRootSnapshot()) || {};
    const baseUi = ctx.asObj(base.ui) || {};
    const baseCfg = ctx.asObj(base.config) || {};
    const baseRuntime = ctx.asObj(base.runtime) || {};
    const baseMode = ctx.asObj(base.mode) || {};

    const stateLike = hasBuildStateOverride(value) ? ctx.asObj(value) || {} : {};
    const uiPatch = hasBuildStateOverride(value) ? {} : ctx.asObj(value) || {};

    const nextUi = { ...baseUi, ...(ctx.asObj(stateLike.ui) || {}), ...uiPatch };
    const nextCfg = {
      ...baseCfg,
      ...(ctx.asObj(stateLike.config) || {}),
    };
    nextCfg.modulesConfiguration = materializeTopModulesConfigurationFromUiConfig(
      nextCfg.modulesConfiguration,
      nextUi,
      nextCfg
    );
    nextCfg.stackSplitLowerModulesConfiguration = cloneModulesConfigurationSnapshot(
      nextCfg,
      'stackSplitLowerModulesConfiguration'
    );

    const rawCorner = ctx.asObj(nextCfg.cornerConfiguration) || {};
    nextCfg.cornerConfiguration = Object.keys(rawCorner).length
      ? cloneCornerConfigurationSnapshot(rawCorner)
      : cloneCornerConfigurationListsSnapshot(rawCorner);

    return {
      ...base,
      ...stateLike,
      ui: nextUi,
      config: nextCfg,
      runtime: { ...baseRuntime, ...(ctx.asObj(stateLike.runtime) || {}) },
      mode: { ...baseMode, ...(ctx.asObj(stateLike.mode) || {}) },
    };
  };

  if (typeof modulesNs.replaceAll !== 'function') {
    modulesNs.replaceAll = function replaceAll(list: unknown, meta?: ActionMetaLike) {
      const m = normMeta(meta, 'actions:modules:replaceAll');
      const next = Array.isArray(list) ? list : [];
      return actions.applyConfig?.({ modulesConfiguration: next }, m);
    };
  }

  if (typeof builderNs.getBuildState !== 'function') {
    builderNs.getBuildState = function getBuildState(override?: unknown) {
      return canonicalizeBuilderState(override);
    };
  }

  if (typeof actions.patch !== 'function') {
    actions.patch = function patch(partial?: PatchPayload, meta?: ActionMetaLike) {
      const payload = partial && typeof partial === 'object' ? { ...partial } : {};
      const m = normMeta(meta, 'actions:patch');
      dispatchCanonicalPatch(payload, m);
      return payload;
    };
  }

  installStateApiUiSurface(ctx);
  installStateApiRuntimeModeSurface(ctx);
}
