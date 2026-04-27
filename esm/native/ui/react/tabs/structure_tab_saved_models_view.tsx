import type { ReactElement } from 'react';

import type { StructureTabSavedModelsViewProps } from './structure_tab_saved_models_view_contracts.js';
import {
  SavedModelsPresetSection,
  SavedModelsPrimaryActions,
  SavedModelsUserSection,
} from './structure_tab_saved_models_view_sections.js';

export function StructureTabSavedModelsView(props: StructureTabSavedModelsViewProps): ReactElement {
  return (
    <div
      className="control-section wp-r-savedmodels"
      style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
    >
      <SavedModelsPresetSection {...props} />
      <SavedModelsUserSection {...props} />
      <SavedModelsPrimaryActions
        saveCurrent={props.saveCurrent}
        deleteSelected={props.deleteSelected}
        moveSelected={props.moveSelected}
      />
    </div>
  );
}
