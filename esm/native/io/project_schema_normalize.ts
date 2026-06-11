import type { ProjectDataLike } from '../../../types/index.js';

import { canonicalizeProjectPayloadConfigSlicesInPlace } from './project_payload_canonical.js';
import { migrateProjectData } from './project_schema_migrate.js';
import {
  cloneProjectJson,
  deepCloneProjectJson,
  ensureProjectDataRecord,
  readPreChestState,
  readSavedNotes,
  safeJsonParse,
  unwrapProjectEnvelope,
} from './project_schema_shared.js';
import { validateProjectData } from './project_schema_validation.js';

export function normalizeProjectData(input: unknown, nowISO?: string): ProjectDataLike | null {
  if (typeof input === 'string') input = safeJsonParse(input);
  const data = unwrapProjectEnvelope(input);
  if (!data || typeof data !== 'object') return null;

  const cloned = ensureProjectDataRecord(deepCloneProjectJson(data));
  const migrated = migrateProjectData(cloned, nowISO);
  if (Object.prototype.hasOwnProperty.call(migrated, 'savedNotes'))
    migrated.savedNotes = readSavedNotes(migrated.savedNotes);
  if (Object.prototype.hasOwnProperty.call(migrated, 'notes'))
    migrated.notes = readSavedNotes(migrated.notes);
  if (Object.prototype.hasOwnProperty.call(migrated, 'orderPdfEditorDraft')) {
    migrated.orderPdfEditorDraft = cloneProjectJson(migrated.orderPdfEditorDraft);
  }
  if (Object.prototype.hasOwnProperty.call(migrated, 'preChestState')) {
    migrated.preChestState = readPreChestState(migrated.preChestState);
  }

  canonicalizeProjectPayloadConfigSlicesInPlace(migrated);

  const validation = validateProjectData(migrated);
  migrated.__validation = validation;

  if (!validation.ok) return null;
  return migrated;
}
