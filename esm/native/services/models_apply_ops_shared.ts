import type { AppContainer } from '../../../types';

import { ensureModelsLoadedInternal } from './models_registry.js';

export function ensureModelsCommandState(App: AppContainer): void {
  ensureModelsLoadedInternal(App, { silent: true });
}
