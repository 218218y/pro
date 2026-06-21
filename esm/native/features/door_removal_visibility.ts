export type DoorRemovalUiSnapshot = Readonly<{
  removeDoorsEnabled?: unknown;
}>;

export type DoorRemovalModeSnapshot = Readonly<{
  primary?: unknown;
}>;

function readBuildToggle(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function isRemoveDoorModeFromSnapshot(
  modeSnapshot: DoorRemovalModeSnapshot | null | undefined
): boolean {
  return modeSnapshot?.primary === 'remove_door';
}

export function resolveRemoveDoorsEnabledFromSnapshots(
  uiSnapshot: DoorRemovalUiSnapshot | null | undefined,
  modeSnapshot: DoorRemovalModeSnapshot | null | undefined
): boolean {
  return readBuildToggle(uiSnapshot?.removeDoorsEnabled) || isRemoveDoorModeFromSnapshot(modeSnapshot);
}
