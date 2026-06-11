import type {
  ProjectDataLike,
  ProjectSchemaValidationResult,
  SplitDoorsBottomMap,
  SplitDoorsMap,
  UnknownRecord,
} from '../../../types/index.js';

import {
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
  asFiniteNumber as asFiniteNumberImpl,
  asObject as asObjectImpl,
  detectProjectSchemaVersion as detectProjectSchemaVersionImpl,
  unwrapProjectEnvelope as unwrapProjectEnvelopeImpl,
} from './project_schema_shared.js';
import {
  migrateProjectData as migrateProjectDataImpl,
  normalizeSplitDoorsBottomMap as normalizeSplitDoorsBottomMapImpl,
  normalizeSplitDoorsMap as normalizeSplitDoorsMapImpl,
} from './project_schema_migrate.js';
import { normalizeProjectData as normalizeProjectDataImpl } from './project_schema_normalize.js';
import { validateProjectData as validateProjectDataImpl } from './project_schema_validation.js';

// Project file schema (v2): migrate on load, stamp on save.
// Payload shape stays stable; metadata fields are prefixed with "__" so older readers can ignore them.
export { PROJECT_SCHEMA_ID, PROJECT_SCHEMA_VERSION };

export function asObject(x: unknown): UnknownRecord {
  return asObjectImpl(x);
}

export function unwrapProjectEnvelope(data: unknown): ProjectDataLike | null {
  return unwrapProjectEnvelopeImpl(data);
}

export function asFiniteNumber(x: unknown): number | undefined {
  return asFiniteNumberImpl(x);
}

export function detectProjectSchemaVersion(data: unknown): number {
  return detectProjectSchemaVersionImpl(data);
}

// FIX28: normalize per-door split map keys (strip *_full/_top/_bot suffixes) so persistence works across picker/build IDs.
export function normalizeSplitDoorsMap(map: unknown): SplitDoorsMap {
  return normalizeSplitDoorsMapImpl(map);
}

// Bottom split map keys: splitb_dX (opt-in). Normalize keys similarly to splitDoorsMap.
export function normalizeSplitDoorsBottomMap(map: unknown): SplitDoorsBottomMap {
  return normalizeSplitDoorsBottomMapImpl(map);
}

export function migrateProjectData(data: ProjectDataLike, nowISO?: string): ProjectDataLike {
  return migrateProjectDataImpl(data, nowISO);
}

export function validateProjectData(data: ProjectDataLike): ProjectSchemaValidationResult {
  return validateProjectDataImpl(data);
}

export function normalizeProjectData(input: unknown, nowISO?: string): ProjectDataLike | null {
  return normalizeProjectDataImpl(input, nowISO);
}
