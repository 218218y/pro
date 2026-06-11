import type { ProjectFileInputTargetLike, ProjectFileLike, ProjectFileLoadEventLike } from '../../../types';

export type ClickableLike = { click: () => void };
type ProjectLoadRuntimeRecordLike = Record<string, unknown>;
type ProjectLoadRuntimeTargetLike = ProjectFileInputTargetLike | null;

type ProjectLoadFileLike = ProjectFileLike & {
  lastModified?: number;
};

function isRecord(value: unknown): value is ProjectLoadRuntimeRecordLike {
  return !!value && typeof value === 'object';
}

function isProjectFileLike(value: unknown): value is ProjectLoadFileLike {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isProjectLoadTargetLike(value: unknown): value is ProjectFileInputTargetLike {
  if (!isRecord(value)) return false;
  if (typeof value.value !== 'undefined' && typeof value.value !== 'string') return false;
  const files = value.files;
  if (typeof files === 'undefined' || files === null) return true;
  return typeof files === 'object' && typeof Reflect.get(files, 'length') === 'number';
}

function readClickMethod(owner: ProjectLoadRuntimeRecordLike): (() => void) | null {
  const value = owner.click;
  if (typeof value !== 'function') return null;
  return () => Reflect.apply(value, owner, []);
}

export function asProjectFileLoadEvent(value: unknown): ProjectFileLoadEventLike | null {
  if (!isRecord(value) || isProjectFileLike(value)) return null;
  return { ...value };
}

export function asClickable(value: unknown): ClickableLike | null {
  if (!isRecord(value)) return null;
  const click = readClickMethod(value);
  return click ? { click } : null;
}

export function openProjectLoadInputTarget(input: unknown): void {
  try {
    asClickable(input)?.click();
  } catch {
    // ignore browser click failures
  }
}

export function resolveProjectLoadFallbackMessage(fallbackMessage?: string | null): string {
  return typeof fallbackMessage === 'string' && fallbackMessage.trim() ? fallbackMessage : 'טעינת קובץ נכשלה';
}

function readProjectLoadTargetCandidate(value: unknown): ProjectLoadRuntimeTargetLike {
  return isProjectLoadTargetLike(value) ? value : null;
}

function readProjectLoadEventTarget(value: unknown): ProjectLoadRuntimeTargetLike {
  if (!isRecord(value) || isProjectFileLike(value)) return null;
  return readProjectLoadTargetCandidate(value.currentTarget) || readProjectLoadTargetCandidate(value.target);
}

function readProjectLoadInputFile(value: unknown): ProjectLoadFileLike | null {
  if (isProjectFileLike(value)) return value;
  const target = readProjectLoadEventTarget(value);
  const files = target?.files ?? null;
  if (!files || typeof files.length !== 'number' || files.length < 1) return null;
  const first = files[0];
  return isProjectFileLike(first) ? first : null;
}

function readProjectLoadFlightPart(value: unknown): string {
  return value == null ? '' : String(value);
}

function readProjectLoadFileFlightKey(file: ProjectLoadFileLike | null | undefined): string | null {
  if (!file) return null;
  const name = readProjectLoadFlightPart(typeof file.name === 'string' ? file.name : '');
  const size = readProjectLoadFlightPart(typeof file.size === 'number' ? file.size : '');
  const type = readProjectLoadFlightPart(typeof file.type === 'string' ? file.type : '');
  const lastModified = readProjectLoadFlightPart(
    typeof file.lastModified === 'number' ? file.lastModified : ''
  );
  if (!name && !size && !type && !lastModified) return null;
  return `file:${[name, size, type, lastModified].join('|')}`;
}

function readProjectLoadTargetValueFlightKey(value: unknown): string | null {
  const target = readProjectLoadEventTarget(value);
  const inputValue = target && typeof target.value === 'string' ? target.value.trim() : '';
  return inputValue ? `target:${inputValue}` : null;
}

export function readProjectLoadFlightKey(
  value: ProjectFileLoadEventLike | ProjectFileLike | unknown
): string | null {
  return (
    readProjectLoadFileFlightKey(readProjectLoadInputFile(value)) ||
    readProjectLoadTargetValueFlightKey(value)
  );
}
