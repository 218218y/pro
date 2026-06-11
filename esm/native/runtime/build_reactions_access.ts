import type { BuildReactionsServiceLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import { healStableSurfaceMethod } from './stable_surface_methods.js';

function asBuildReactionsService(value: unknown): BuildReactionsServiceLike | null {
  return asRecord<BuildReactionsServiceLike>(value);
}

function healBuildReactionsSurface(
  service: BuildReactionsServiceLike | null
): BuildReactionsServiceLike | null {
  if (!service) return null;

  healStableSurfaceMethod(service, 'afterBuild', '__wpAfterBuild');
  return service;
}

export function getBuildReactionsServiceMaybe(App: unknown): BuildReactionsServiceLike | null {
  try {
    return healBuildReactionsSurface(asBuildReactionsService(getServiceSlotMaybe(App, 'buildReactions')));
  } catch {
    return null;
  }
}

export function ensureBuildReactionsService(App: unknown): BuildReactionsServiceLike {
  const service = ensureServiceSlot<BuildReactionsServiceLike>(App, 'buildReactions');
  return healBuildReactionsSurface(asBuildReactionsService(service) || service) || service;
}
