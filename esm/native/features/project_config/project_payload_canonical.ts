import type { ProjectDataLike, UnknownRecord } from '../../../../types/index.js';

import { cloneCornerConfigurationListsSnapshot } from '../modules_configuration/corner_cells_api.js';

import { canonicalizeProjectConfigListsForExportPayload } from './project_config_lists_runtime.js';
import { asObjectRecord } from '../../../shared/project_json_clone.js';

function stripSketchExtrasFromModules(list: unknown): void {
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i += 1) {
    const item = asObjectRecord(list[i]);
    if (!item) continue;
    try {
      delete item.sketchExtras;
    } catch {
      // ignore sketch-only cleanup failures
    }
  }
}

export function canonicalizeProjectPayloadConfigSlicesInPlace(
  data: ProjectDataLike | UnknownRecord | null | undefined
): void {
  const rec = asObjectRecord(data);
  if (!rec) return;

  const canonicalLists = canonicalizeProjectConfigListsForExportPayload(rec);
  rec.modulesConfiguration = canonicalLists.modulesConfiguration;
  rec.stackSplitLowerModulesConfiguration = canonicalLists.stackSplitLowerModulesConfiguration;
  rec.cornerConfiguration = canonicalLists.cornerConfiguration;
}

export function normalizeResetDefaultProjectStructureInPlace(
  data: ProjectDataLike | UnknownRecord | null | undefined
): void {
  const rec = asObjectRecord(data);
  if (!rec) return;

  const toggles = asObjectRecord(rec.toggles) || {};
  const settings = asObjectRecord(rec.settings) || {};

  rec.toggles = toggles;
  rec.settings = settings;
  rec.projectName = '';

  toggles.cornerMode = false;
  toggles.removeDoors = false;
  toggles.sketchMode = false;
  settings.stackSplitEnabled = false;

  canonicalizeProjectPayloadConfigSlicesInPlace(rec);
  stripSketchExtrasFromModules(rec.modulesConfiguration);

  rec.stackSplitLowerModulesConfiguration = [];
  rec.cornerConfiguration = {
    ...cloneCornerConfigurationListsSnapshot({}),
    modulesConfiguration: [],
    stackSplitLower: { modulesConfiguration: [] },
  };
}
