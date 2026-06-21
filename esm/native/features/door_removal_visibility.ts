import type { ModeStateLike, UiStateLike } from '../../../types';

function readBuildToggle(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function resolveRemoveDoorsEnabledFromSnapshots(
  uiSnapshot: UiStateLike | null | undefined,
  modeSnapshot: ModeStateLike | null | undefined
): boolean {
  return (
    readBuildToggle(uiSnapshot?.removeDoorsEnabled) ||
    (typeof modeSnapshot?.primary === 'string' && modeSnapshot.primary === 'remove_door')
  );
}
