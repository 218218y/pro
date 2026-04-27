import {
  seedInternalGridMap,
  type AppLike,
  type StorageLike,
  type ColorsActionsLike,
  type RoomActionsLike,
} from './boot_seeds_part02_shared.js';
import { seedMultiColorMode, seedSavedColors, seedColorSwatchesOrder } from './boot_seeds_part02_colors.js';
import { seedWardrobeType, seedManualWidthFlag } from './boot_seeds_part02_flags.js';
import { applyBootSeedsPart02, installBootSeedsPart02 } from './boot_seeds_part02_runtime.js';

export type { AppLike, StorageLike, ColorsActionsLike, RoomActionsLike };
export {
  seedInternalGridMap,
  seedMultiColorMode,
  seedSavedColors,
  seedColorSwatchesOrder,
  seedWardrobeType,
  seedManualWidthFlag,
  applyBootSeedsPart02,
  installBootSeedsPart02,
};
