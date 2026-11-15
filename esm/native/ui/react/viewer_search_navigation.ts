import type { AppContainer } from '../../../../types';
import type { ViewerSearchDestination } from './viewer_search_catalog.js';

type Listener = (destination: ViewerSearchDestination) => void;

// One-shot UI commands between the two independent React roots. The project state
// continues to live exclusively in the canonical store; no DOM or shadow app state.
const listeners = new WeakMap<AppContainer, Set<Listener>>();

export function subscribeViewerSearchNavigation(app: AppContainer, listener: Listener): () => void {
  const current = listeners.get(app) ?? new Set<Listener>();
  current.add(listener);
  listeners.set(app, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) listeners.delete(app);
  };
}

export function navigateToViewerSearchDestination(
  app: AppContainer,
  destination: ViewerSearchDestination
): void {
  for (const listener of listeners.get(app) ?? []) listener(destination);
}
