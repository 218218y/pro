import type { ActionMetaLike, DrawerVisualEntryLike, ModuleConfigLike, UnknownRecord } from '../../../types';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type PatchConfigForKeyFn = (
  mk: ModuleKey | 'corner' | null,
  patchFn: (cfg: ModuleConfigLike) => void,
  meta: ActionMetaLike
) => unknown;

export type InternalGridInfoLike = UnknownRecord & {
  effectiveBottomY?: number;
  effectiveTopY?: number;
  gridDivisions?: number;
};

export type DrawerVisualLike = DrawerVisualEntryLike & {
  isInternal?: boolean;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asInternalGridInfo(value: unknown): InternalGridInfoLike | null {
  return asRecord(value);
}

export function readDrawerUserData(drawer: DrawerVisualEntryLike | null | undefined): UnknownRecord | null {
  const group = drawer?.group;
  const groupRecord = asRecord(group);
  return groupRecord ? asRecord(groupRecord.userData) : null;
}

export function hasPartId(drawer: DrawerVisualEntryLike | null | undefined, partId: string | null): boolean {
  if (!drawer || !partId) return false;
  const userData = readDrawerUserData(drawer);
  return typeof userData?.partId === 'string' && userData.partId === partId;
}

export function readDrawerId(drawer: DrawerVisualEntryLike | null | undefined): string | null {
  return drawer && drawer.id != null ? String(drawer.id) : null;
}

export function readDrawerIsInternal(
  drawer: DrawerVisualLike | DrawerVisualEntryLike | null | undefined
): boolean | null {
  const drawerRecord = asRecord(drawer);
  if (typeof drawerRecord?.isInternal === 'boolean') return drawerRecord.isInternal;
  return null;
}
