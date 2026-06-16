import type { ProjectDataLike } from '../../../types/index.js';

import { canonicalizeProjectPayloadConfigSlicesInPlace } from './project_payload_canonical.js';
import { normalizeCurrentProjectData } from './project_schema_current.js';
import {
  cloneProjectJson,
  deepCloneProjectJson,
  ensureProjectDataRecord,
  hasCurrentProjectSchema,
  readPreChestState,
  readSavedNotes,
  safeJsonParse,
} from './project_schema_shared.js';
import { validateProjectData } from './project_schema_validation.js';

export function normalizeProjectData(input: unknown, nowISO?: string): ProjectDataLike | null {
  if (typeof input === 'string') input = safeJsonParse(input);
  if (!hasCurrentProjectSchema(input)) return null;

  const cloned = ensureProjectDataRecord(deepCloneProjectJson(input));
  const normalized = normalizeCurrentProjectData(cloned, nowISO);
  if (Object.prototype.hasOwnProperty.call(normalized, 'savedNotes'))
    normalized.savedNotes = readSavedNotes(normalized.savedNotes);
  if (Object.prototype.hasOwnProperty.call(normalized, 'notes'))
    normalized.notes = readSavedNotes(normalized.notes);
  if (Object.prototype.hasOwnProperty.call(normalized, 'orderPdfEditorDraft')) {
    normalized.orderPdfEditorDraft = cloneProjectJson(normalized.orderPdfEditorDraft);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'preChestState')) {
    normalized.preChestState = readPreChestState(normalized.preChestState);
  }

  canonicalizeProjectPayloadConfigSlicesInPlace(normalized);

  const validation = validateProjectData(normalized);
  normalized.__validation = validation;

  if (!validation.ok) return null;
  return normalized;
}
