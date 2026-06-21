import type { ProjectDataLike, ProjectSchemaValidationResult, UnknownRecord } from '../../../types/index.js';

import {
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
  asObject as asObjectImpl,
  detectProjectSchemaVersion as detectProjectSchemaVersionImpl,
  hasCurrentProjectSchema as hasCurrentProjectSchemaImpl,
} from './project_schema_shared.js';
import { normalizeProjectData as normalizeProjectDataImpl } from './project_schema_normalize.js';
import { validateProjectData as validateProjectDataImpl } from './project_schema_validation.js';

// Project file schema (v3): canonical current-schema load, stamp on save, no historical migrations.
export { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION };

export function asObject(x: unknown): UnknownRecord {
  return asObjectImpl(x);
}

export function hasCurrentProjectSchema(data: unknown): boolean {
  return hasCurrentProjectSchemaImpl(data);
}

export function detectProjectSchemaVersion(data: unknown): number {
  return detectProjectSchemaVersionImpl(data);
}

export function validateProjectData(data: ProjectDataLike): ProjectSchemaValidationResult {
  return validateProjectDataImpl(data);
}

export function normalizeProjectData(input: unknown, nowISO?: string): ProjectDataLike | null {
  return normalizeProjectDataImpl(input, nowISO);
}
