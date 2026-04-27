import type { ProjectDataLike } from '../../../types/index.js';

export function stampProjectSchemaMetadata(args: {
  data: ProjectDataLike;
  schemaId: string;
  schemaVersion: number;
  nowISO?: string;
  detectedVersion: number;
}): void {
  const { data, schemaId, schemaVersion, nowISO, detectedVersion } = args;
  data.__schema = data.__schema || schemaId;
  data.__version = schemaVersion;
  if (!data.__createdAt) data.__createdAt = nowISO || new Date().toISOString();

  if (detectedVersion && detectedVersion !== schemaVersion) data.__migratedFrom = detectedVersion;
  else if (!detectedVersion) data.__migratedFrom = 0;
}
