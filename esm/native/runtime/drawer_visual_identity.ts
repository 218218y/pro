import type { DrawerVisualEntryLike, UnknownRecord } from '../../../types';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readStringish(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function pushUnique(out: string[], value: unknown): void {
  const normalized = readStringish(value);
  if (!normalized) return;
  if (!out.includes(normalized)) out.push(normalized);
}

export function readDrawerVisualUserData(
  drawer: DrawerVisualEntryLike | null | undefined
): UnknownRecord | null {
  const group = isRecord(drawer?.group) ? drawer?.group : null;
  const userData = isRecord(group?.userData) ? group.userData : null;
  return userData || null;
}

export function collectDrawerVisualIdentityAliases(
  drawer: DrawerVisualEntryLike | null | undefined
): string[] {
  const out: string[] = [];
  if (!drawer) return out;

  pushUnique(out, drawer.id);
  pushUnique(out, drawer.drawerId);
  pushUnique(out, drawer.partId);
  pushUnique(out, drawer.dividerKey);

  const userData = readDrawerVisualUserData(drawer);
  if (userData) {
    pushUnique(out, userData.partId);
    pushUnique(out, userData.drawerId);
    pushUnique(out, userData.__wpDrawerOwnerPartId);
  }

  return out;
}

export function readDrawerVisualPrimaryId(drawer: DrawerVisualEntryLike | null | undefined): string | null {
  const aliases = collectDrawerVisualIdentityAliases(drawer);
  return aliases[0] ?? null;
}

export function drawerVisualMatchesId(
  drawer: DrawerVisualEntryLike | null | undefined,
  id: unknown
): boolean {
  const normalized = readStringish(id);
  if (!normalized || !drawer) return false;
  return collectDrawerVisualIdentityAliases(drawer).includes(normalized);
}

export function readDrawerIdFromHitUserData(userData: unknown): string | null {
  const rec = isRecord(userData) ? userData : null;
  if (!rec) return null;
  return (
    readStringish(rec.drawerId) ||
    readStringish(rec.__wpDrawerOwnerPartId) ||
    readStringish(rec.__wpDrawerId) ||
    null
  );
}

export function isExplicitExternalDrawerVisual(drawer: DrawerVisualEntryLike | null | undefined): boolean {
  const userData = readDrawerVisualUserData(drawer);
  if (userData?.__wpType === 'extDrawer') return true;
  if (drawer && typeof drawer.isInternal === 'boolean') return drawer.isInternal === false;
  return false;
}
