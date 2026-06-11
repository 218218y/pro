import type { AppContainer, ModelsCommandResult, SavedModelId } from '../../../types';

import { loadProjectStructureResult } from './models_apply_project.js';
import { buildProjectStructureFromCurrentModel } from './models_apply_snapshot_ops.js';

export function applyModelInternalImpl(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  const projectStructure = buildProjectStructureFromCurrentModel(App, id);
  if (!projectStructure) return { ok: false, reason: 'missing' };
  return loadProjectStructureResult(App, projectStructure);
}
