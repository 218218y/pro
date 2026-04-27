import type { InputTargetLike } from './settings_backup_shared_contracts.js';
import { isRecord } from './settings_backup_shared_contracts.js';

export function getInputTarget(input: unknown): InputTargetLike | null {
  if (!isRecord(input)) return null;
  const target = isRecord(input.target)
    ? input.target
    : isRecord(input.currentTarget)
      ? input.currentTarget
      : null;
  return target;
}

export function isFileLike(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File;
}

export function getImportFile(input: unknown): File | null {
  if (!input) return null;
  if (isFileLike(input)) return input;
  const target = getInputTarget(input);
  const files = target?.files ?? null;
  const file = files && files[0] ? files[0] : null;
  return isFileLike(file) ? file : null;
}

export function clearInputValue(input: unknown): void {
  try {
    const target = getInputTarget(input);
    if (target && 'value' in target) target.value = '';
  } catch {
    // ignore
  }
}
