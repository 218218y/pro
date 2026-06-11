import type { StateApiHistoryMetaReactivityContext } from './state_api_history_meta_reactivity_contracts.js';

import { installStateApiStoreReactivityRuntime } from './state_api_history_store_reactivity_runtime.js';

export function installStateApiStoreReactivity(ctx: StateApiHistoryMetaReactivityContext): void {
  installStateApiStoreReactivityRuntime(ctx);
}
