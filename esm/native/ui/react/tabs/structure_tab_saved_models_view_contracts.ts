import type { StructureTabSavedModelsController } from './use_structure_tab_saved_models_controller_contracts.js';

export type StructureTabSavedModelsViewProps = StructureTabSavedModelsController;

export const SAVED_MODELS_HEADER_TITLE_STYLE = {
  color: 'var(--text-main)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 0,
} as const;
