import { createStructureTabStructuralSyncController } from './structure_tab_structural_controller_sync.js';
import {
  type CreateStructureTabStructuralControllerArgs,
  type StructureTabStructuralController,
} from './structure_tab_structural_controller_contracts.js';
import { createStructureTabStructuralWriteController } from './structure_tab_structural_controller_writes.js';

export type {
  CreateStructureTabStructuralControllerArgs,
  StructureTabStructuralController,
  StructureUiPartial,
} from './structure_tab_structural_controller_contracts.js';

export { readUiRawNumberFromApp } from './structure_tab_structural_controller_shared.js';

export function createStructureTabStructuralController(
  args: CreateStructureTabStructuralControllerArgs
): StructureTabStructuralController {
  return {
    ...createStructureTabStructuralSyncController(args),
    ...createStructureTabStructuralWriteController(args),
  };
}
