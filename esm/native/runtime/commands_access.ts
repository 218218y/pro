import type { CommandsServiceLike } from '../../../types';

import { asRecord } from './record.js';
import { healStableSurfaceMethod } from './stable_surface_methods.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

const COMMANDS_REBUILD_CANONICAL_KEY = '__wpCanonicalRebuildWardrobe';
const COMMANDS_REBUILD_DEBOUNCED_CANONICAL_KEY = '__wpCanonicalRebuildWardrobeDebounced';
const COMMANDS_CLEAN_GROUP_CANONICAL_KEY = '__wpCanonicalCleanGroup';

function asCommandsService(value: unknown): CommandsServiceLike | null {
  return asRecord<CommandsServiceLike>(value);
}

function healCommandsSurface(service: CommandsServiceLike | null): CommandsServiceLike | null {
  if (!service) return null;

  healStableSurfaceMethod(service, 'rebuildWardrobe', COMMANDS_REBUILD_CANONICAL_KEY);
  healStableSurfaceMethod(service, 'rebuildWardrobeDebounced', COMMANDS_REBUILD_DEBOUNCED_CANONICAL_KEY);
  healStableSurfaceMethod(service, 'cleanGroup', COMMANDS_CLEAN_GROUP_CANONICAL_KEY);
  return service;
}

export function getCommandsServiceMaybe(App: unknown): CommandsServiceLike | null {
  try {
    return healCommandsSurface(asCommandsService(getServiceSlotMaybe(App, 'commands')));
  } catch {
    return null;
  }
}

export function ensureCommandsService(App: unknown): CommandsServiceLike {
  const service = ensureServiceSlot<CommandsServiceLike>(App, 'commands');
  return healCommandsSurface(asCommandsService(service) || service) || service;
}
