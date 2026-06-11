// Canonical state_api history/meta/reactivity installer.
//
// Why this exists:
// - state_api.ts owns the public action surface, but late install blocks were too dense inline
// - history/meta/reactivity are explicit kernel seams and deserve one focused installer
// - this keeps owner entrypoint canonical while reducing namespace/policy density

import { installStateApiHistoryNamespace } from './state_api_history_namespace.js';
import { installStateApiMetaNamespace } from './state_api_meta_namespace.js';
import { installStateApiStoreReactivity } from './state_api_history_store_reactivity.js';

export type { StateApiHistoryMetaReactivityContext } from './state_api_history_meta_reactivity_contracts.js';
import type { StateApiHistoryMetaReactivityContext } from './state_api_history_meta_reactivity_contracts.js';

export function installStateApiHistoryMetaReactivity(ctx: StateApiHistoryMetaReactivityContext): void {
  installStateApiStoreReactivity(ctx);
  installStateApiHistoryNamespace(ctx);
  installStateApiMetaNamespace(ctx);
}
