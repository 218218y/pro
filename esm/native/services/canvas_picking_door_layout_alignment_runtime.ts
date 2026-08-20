import type { AppContainer } from '../../../types';

import { readGrooveLinesCountForPart } from './canvas_picking_door_edit_shared.js';
import { readDoorRuntimeEntries, readDrawerRuntimeEntries } from './doors_runtime_lifecycle_shared.js';
import type { DoorLayoutAlignmentCapabilities } from './canvas_picking_door_layout_alignment.js';

const capabilitiesByApp = new WeakMap<AppContainer, DoorLayoutAlignmentCapabilities>();

/**
 * Thin AppContainer adapter for the door-layout alignment core.
 *
 * The adapter is cached because alignment runs on the hover path. The core itself
 * only sees the three read capabilities it actually needs and remains independent
 * from the full application container.
 */
export function createDoorLayoutAlignmentCapabilities(App: AppContainer): DoorLayoutAlignmentCapabilities {
  const cached = capabilitiesByApp.get(App);
  if (cached) return cached;

  const capabilities: DoorLayoutAlignmentCapabilities = {
    readDoorEntries: () => readDoorRuntimeEntries(App),
    readDrawerEntries: () => readDrawerRuntimeEntries(App),
    readGrooveLinesCountForPart: (partId: string) => readGrooveLinesCountForPart(App, partId),
  };
  capabilitiesByApp.set(App, capabilities);
  return capabilities;
}
