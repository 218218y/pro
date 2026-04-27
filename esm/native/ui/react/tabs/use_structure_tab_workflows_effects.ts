import { useEffect } from 'react';

import type { StructureTabStructuralController } from './structure_tab_structural_controller_contracts.js';
import type { StructureTabWorkflowController } from './structure_tab_workflows_controller_runtime.js';

export function useStructureTabWorkflowControllerEffects(args: {
  structuralController: StructureTabStructuralController;
  workflowController: StructureTabWorkflowController;
}): void {
  const { structuralController, workflowController } = args;

  useEffect(() => {
    workflowController.syncLibraryModePreState();
  }, [workflowController]);

  useEffect(() => {
    structuralController.syncSingleDoorPos();
  }, [structuralController]);

  useEffect(() => {
    structuralController.syncHingeVisibility();
  }, [structuralController]);

  useEffect(() => {
    workflowController.ensureLibraryInvariants();
  }, [workflowController]);
}
