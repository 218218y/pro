import type {
  ProjectFileInputTargetLike,
  ProjectFileLike,
  ProjectFileLoadEventLike,
  UnknownRecord,
} from '../../../types';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function isProjectFileLike(value: unknown): value is ProjectFileLike {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function readFileInputTarget(event: ProjectFileLoadEventLike | unknown): ProjectFileInputTargetLike | null {
  const rec = asRecord(event);
  const target = rec ? asRecord(rec.target) : null;
  return target && !Array.isArray(target) ? target : null;
}

function readFirstFile(target: ProjectFileInputTargetLike | null): ProjectFileLike | null {
  const files = target?.files;
  if (!files || typeof files.length !== 'number' || files.length < 1) return null;
  const first = files[0];
  return isProjectFileLike(first) ? first : null;
}

export function resolveProjectFileLoadInput(
  eventOrFile: ProjectFileLoadEventLike | ProjectFileLike | unknown
): { file: ProjectFileLike | null; target: ProjectFileInputTargetLike | null } {
  if (isProjectFileLike(eventOrFile)) return { file: eventOrFile, target: null };
  const target = readFileInputTarget(eventOrFile);
  return { file: readFirstFile(target), target };
}
