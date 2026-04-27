import { getBuilderRegistry } from '../runtime/builder_service_access.js';

import type { AppContainer } from './render_ops_shared_contracts.js';
import { __renderOpsHandleCatch } from './render_ops_shared_errors.js';

export function __reg(App: AppContainer, partId: unknown, obj: unknown, kind: unknown): void {
  try {
    const reg = getBuilderRegistry(App);
    if (reg && typeof reg.registerPartObject === 'function') {
      const pid = typeof partId === 'string' ? partId : partId == null ? '' : String(partId);
      if (!pid) return;
      const k = typeof kind === 'string' ? kind : undefined;
      reg.registerPartObject(pid, obj, k);
    }
  } catch (e) {
    __renderOpsHandleCatch(
      App,
      '__reg.registerPartObject',
      e,
      { partId, kind },
      { failFast: true, throttleMs: 5000 }
    );
  }
}
