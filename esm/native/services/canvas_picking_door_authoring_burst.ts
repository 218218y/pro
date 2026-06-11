import type { AppContainer } from '../../../types';

import { requestBuilderStructuralRefresh } from '../runtime/builder_service_access.js';

export function requestDoorAuthoringBurstRefresh(App: AppContainer, source: string): void {
  requestBuilderStructuralRefresh(App, {
    source,
    immediate: false,
    force: false,
    triggerRender: false,
    updateShadows: false,
  });
}
