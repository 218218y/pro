import type {
  StructureTabCornerChestActionsArgs,
  StructureTabCornerChestActionsController,
} from './structure_tab_corner_chest_actions_controller_contracts.js';
import { createStructureTabCornerActionsController } from './structure_tab_corner_chest_actions_controller_corner.js';
import { createStructureTabChestActionsController } from './structure_tab_corner_chest_actions_controller_chest.js';

export type {
  StructureTabCornerChestActionsArgs,
  StructureTabCornerChestActionsController,
} from './structure_tab_corner_chest_actions_controller_contracts.js';

export function createStructureTabCornerChestActionsController(
  args: StructureTabCornerChestActionsArgs
): StructureTabCornerChestActionsController {
  return {
    ...createStructureTabCornerActionsController(args),
    ...createStructureTabChestActionsController(args),
  };
}
