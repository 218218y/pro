import type { ReactElement } from 'react';

import { StructureTabSavedModelsView } from './structure_tab_saved_models_view.js';
import { useStructureTabSavedModelsController } from './use_structure_tab_saved_models_controller.js';

export function SavedModelsPanel(): ReactElement {
  const controller = useStructureTabSavedModelsController();
  return <StructureTabSavedModelsView {...controller} />;
}
