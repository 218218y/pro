import type { ProjectFileLoadEventLike } from '../../../types';

export type ProjectLoadInputTargetLike =
  | {
      value?: string;
    }
  | null
  | undefined;

type ProjectLoadInputEventRecord = Record<string, unknown>;

function isEventRecord(value: unknown): value is ProjectLoadInputEventRecord {
  return !!value && typeof value === 'object';
}

function readInputTargetCandidate(value: unknown): ProjectLoadInputTargetLike {
  return isEventRecord(value) ? value : null;
}

export function readProjectLoadInputTarget(
  evt: ProjectFileLoadEventLike | unknown
): ProjectLoadInputTargetLike {
  if (!isEventRecord(evt)) return null;
  return readInputTargetCandidate(evt.currentTarget) || readInputTargetCandidate(evt.target);
}

export function resetProjectLoadInputTarget(target: ProjectLoadInputTargetLike): void {
  try {
    if (target && typeof target === 'object' && 'value' in target) target.value = '';
  } catch {
    // ignore browser reset failures
  }
}
