import { createRoomArchitecturePlan } from '../esm/native/builder/room_architecture_geometry.ts';
import { normalizeRoomArchitecture } from '../esm/shared/room_architecture_shared.ts';

import type { RoomArchitecturePlan } from '../types/index.ts';

export function createTestRoomArchitecturePlan(
  dimensions: { widthM?: number; heightM?: number; depthM?: number } = {}
): RoomArchitecturePlan {
  return createRoomArchitecturePlan({
    config: normalizeRoomArchitecture({}),
    wardrobeWidthM: dimensions.widthM ?? 1.8,
    wardrobeHeightM: dimensions.heightM ?? 2.4,
    wardrobeDepthM: dimensions.depthM ?? 0.6,
  });
}
