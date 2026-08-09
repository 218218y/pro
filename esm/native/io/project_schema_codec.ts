import type { ProjectDataLike } from '../../../types/index.js';
import { normalizeProjectData } from './project_schema_normalize.js';
import {
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
  deepCloneProjectJson,
  hasCurrentProjectSchema,
} from './project_schema_shared.js';
import { validateProjectData } from './project_schema_validation.js';

function serializeCanonicalProjectValue(value: unknown): string {
  const seen = new WeakSet<object>();
  function serialize(entry: unknown): string | undefined {
    if (entry === null) return 'null';
    if (typeof entry === 'string') return JSON.stringify(entry);
    if (typeof entry === 'boolean') return entry ? 'true' : 'false';
    if (typeof entry === 'number') return Number.isFinite(entry) ? String(entry) : 'null';
    if (typeof entry === 'undefined' || typeof entry === 'function' || typeof entry === 'symbol')
      return undefined;
    if (typeof entry === 'bigint') throw new TypeError('Project JSON cannot serialize bigint values');
    if (typeof entry !== 'object') return undefined;
    if (seen.has(entry)) throw new TypeError('Project JSON cannot serialize circular values');
    seen.add(entry);
    try {
      if (Array.isArray(entry)) return `[${entry.map(item => serialize(item) ?? 'null').join(',')}]`;
      const record = entry as Record<string, unknown>;
      const parts: string[] = [];
      for (const key of Object.keys(record).sort()) {
        const serialized = serialize(record[key]);
        if (typeof serialized !== 'undefined') parts.push(`${JSON.stringify(key)}:${serialized}`);
      }
      return `{${parts.join(',')}}`;
    } finally {
      seen.delete(entry);
    }
  }
  const serialized = serialize(value);
  if (typeof serialized === 'undefined')
    throw new TypeError('Project JSON requires a serializable root value');
  return serialized;
}

function fingerprintProjectValue(value: unknown): string {
  const serialized = serializeCanonicalProjectValue(value);
  let hash = 2166136261;
  for (let i = 0; i < serialized.length; i += 1) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${serialized.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function validateCurrentProjectData(value: unknown): value is ProjectDataLike {
  if (!hasCurrentProjectSchema(value)) return false;
  return validateProjectData(value as ProjectDataLike).ok;
}

export const projectSchemaCodec = Object.freeze({
  validate: validateCurrentProjectData,
  normalize(value: unknown): ProjectDataLike | null {
    return normalizeProjectData(value);
  },
  clone(value: ProjectDataLike): ProjectDataLike {
    return deepCloneProjectJson(value) as ProjectDataLike;
  },
  serialize(value: ProjectDataLike): string {
    return serializeCanonicalProjectValue(value);
  },
  fingerprint(value: ProjectDataLike): string {
    return fingerprintProjectValue(value);
  },
});

type ProjectSchemaIdentity = Readonly<{
  schemaId: string;
  schemaVersion: number;
}>;

function validateProjectDataForSchema(value: ProjectDataLike, schema: ProjectSchemaIdentity): boolean {
  if (value.__schema !== schema.schemaId || value.__version !== schema.schemaVersion) return false;
  return validateProjectData(value).ok;
}

export function serializeProjectDataForFile(
  value: ProjectDataLike,
  spacing = 2,
  schema: ProjectSchemaIdentity = {
    schemaId: PROJECT_SCHEMA_ID,
    schemaVersion: PROJECT_SCHEMA_VERSION,
  }
): string {
  if (!validateProjectDataForSchema(value, schema)) {
    throw new TypeError('Cannot serialize a non-canonical project payload for the requested schema');
  }
  const canonical = projectSchemaCodec.serialize(value);
  return spacing > 0 ? JSON.stringify(JSON.parse(canonical), null, spacing) : canonical;
}
