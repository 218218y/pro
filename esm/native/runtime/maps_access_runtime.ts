import type { MapsNamespaceLike } from '../../../types';

import { mapsBagMaybe } from './maps_access_shared.js';

export type RuntimeMapsNamespace = MapsNamespaceLike;

export function readMapsBagOrNull(App: unknown) {
  return mapsBagMaybe(App);
}
