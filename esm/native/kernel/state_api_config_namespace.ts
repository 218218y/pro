import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ConfigActionsNamespaceLike,
  ConfigSlicePatch,
  RootStoreLike,
  UnknownRecord,
} from '../../../types';

import type { MetaNs } from './state_api_shared.js';
import { installStateApiConfigNamespaceCore } from './state_api_config_namespace_core.js';
import { installStateApiConfigNamespaceMaps } from './state_api_config_namespace_maps.js';
import { installStateApiConfigNamespaceScalars } from './state_api_config_namespace_scalars.js';

export interface StateApiConfigNamespaceInstallContext {
  actions: ActionsNamespaceLike;
  configNs: ConfigActionsNamespaceLike;
  metaActionsNs: MetaNs | null;
  store: RootStoreLike;
  readCfgSnapshot(): UnknownRecord;
  readUiSnapshot(): UnknownRecord;
  normMeta(meta: unknown, source: string): ActionMetaLike;
  safeCall(fn: () => unknown): unknown;
  shallowCloneObj(v: unknown): UnknownRecord;
  commitConfigPatch(patch: ConfigSlicePatch, meta: ActionMetaLike): unknown;
  projectConfigReplaceKeys: Record<string, true>;
  paintConfigReplaceKeys: readonly string[];
  modulesGeometryReplaceKeys: Record<string, true>;
}

export function installStateApiConfigNamespace(ctx: StateApiConfigNamespaceInstallContext): void {
  installStateApiConfigNamespaceCore(ctx);
  installStateApiConfigNamespaceMaps(ctx);
  installStateApiConfigNamespaceScalars(ctx);
  void ctx.paintConfigReplaceKeys;
}
