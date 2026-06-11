import type { DoorVisualEntryLike, DrawerVisualEntryLike, UnknownRecord } from '../../../types';

export type SketchFreeBoxMotionScope = {
  boxId: string;
  moduleKey: string | null;
  prefix: string;
};

const FREE_BOX_PART_PREFIX = 'sketch_box_free_';
const FREE_BOX_SCOPE_SUFFIX_MARKERS = [
  '_door_',
  '_ext_drawers_',
  '_int_drawers_',
  '_shelf_',
  '_divider_',
  '_side_',
  '_back',
  '_top',
  '_bottom',
  '_left',
  '_right',
];

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizePrefix(prefix: string): string | null {
  const text = String(prefix || '').trim();
  if (!text.startsWith(FREE_BOX_PART_PREFIX)) return null;
  return text.replace(/_+$/, '');
}

function splitModuleAndBoxFromPrefix(prefix: string): { moduleKey: string | null; boxId: string } | null {
  const normalized = normalizePrefix(prefix);
  if (!normalized) return null;
  const rest = normalized.slice(FREE_BOX_PART_PREFIX.length);
  if (!rest) return null;

  const firstUnderscore = rest.indexOf('_');
  if (firstUnderscore > 0) {
    const first = rest.slice(0, firstUnderscore);
    const remainder = rest.slice(firstUnderscore + 1);
    if (remainder && (/^\d+$/.test(first) || /^lower_\d+$/i.test(`${first}_${remainder}`))) {
      return { moduleKey: first, boxId: remainder };
    }
  }

  const lowerMatch = /^(lower_\d+)_(.+)$/i.exec(rest);
  if (lowerMatch?.[1] && lowerMatch?.[2]) {
    return { moduleKey: lowerMatch[1], boxId: lowerMatch[2] };
  }

  return { moduleKey: null, boxId: rest };
}

function extractPrefixFromPartId(partId: string, boxId?: string | null): string | null {
  const pid = String(partId || '').trim();
  if (!pid.startsWith(FREE_BOX_PART_PREFIX)) return null;

  const cleanBoxId = readString(boxId);
  if (cleanBoxId) {
    const marker = `_${cleanBoxId}`;
    const markerIndex = pid.indexOf(marker, FREE_BOX_PART_PREFIX.length);
    if (markerIndex >= 0) {
      return normalizePrefix(pid.slice(0, markerIndex + marker.length));
    }

    const directPrefix = `${FREE_BOX_PART_PREFIX}${cleanBoxId}`;
    if (pid === directPrefix || pid.startsWith(`${directPrefix}_`)) return normalizePrefix(directPrefix);
  }

  let end = pid.length;
  for (const marker of FREE_BOX_SCOPE_SUFFIX_MARKERS) {
    const idx = pid.indexOf(marker, FREE_BOX_PART_PREFIX.length);
    if (idx > 0 && idx < end) end = idx;
  }
  return normalizePrefix(pid.slice(0, end));
}

export function readSketchFreeBoxMotionScopeFromUserData(userData: unknown): SketchFreeBoxMotionScope | null {
  const rec = asRecord(userData);
  if (!rec) return null;

  const partId = readString(rec.partId);
  const isFreePlacement = rec.__wpSketchFreePlacement === true;
  if (!isFreePlacement && !(partId && partId.startsWith(FREE_BOX_PART_PREFIX))) return null;

  const boxId = readString(rec.__wpSketchBoxId);
  const prefix = partId ? extractPrefixFromPartId(partId, boxId) : null;
  if (prefix) {
    const parsed = splitModuleAndBoxFromPrefix(prefix);
    return {
      boxId: boxId || parsed?.boxId || '',
      moduleKey: readString(rec.__wpSketchModuleKey) || parsed?.moduleKey || null,
      prefix,
    };
  }

  if (!boxId) return null;
  const moduleKey = readString(rec.__wpSketchModuleKey);
  const fallbackPrefix = normalizePrefix(
    `${FREE_BOX_PART_PREFIX}${moduleKey ? `${moduleKey}_` : ''}${boxId}`
  );
  return fallbackPrefix ? { boxId, moduleKey, prefix: fallbackPrefix } : null;
}

export function readSketchFreeBoxMotionScopeFromPartId(
  partId: unknown,
  boxId?: string | null,
  moduleKey?: string | null
): SketchFreeBoxMotionScope | null {
  const pid = readString(partId);
  if (!pid) return null;
  const prefix = extractPrefixFromPartId(pid, boxId);
  if (!prefix) return null;
  const parsed = splitModuleAndBoxFromPrefix(prefix);
  const resolvedBoxId = readString(boxId) || parsed?.boxId || '';
  if (!resolvedBoxId) return null;
  return {
    boxId: resolvedBoxId,
    moduleKey: readString(moduleKey) || parsed?.moduleKey || null,
    prefix,
  };
}

export function getSketchFreeBoxMotionScopeFromEntry(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | UnknownRecord | null | undefined
): SketchFreeBoxMotionScope | null {
  const rec = asRecord(entry);
  if (!rec) return null;
  const group = asRecord(rec.group);
  const userDataScope = readSketchFreeBoxMotionScopeFromUserData(group?.userData);
  if (userDataScope) return userDataScope;
  return readSketchFreeBoxMotionScopeFromPartId(rec.partId || rec.id || rec.dividerKey || null);
}

export function isSketchFreeBoxMotionScopeMatch(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | UnknownRecord | null | undefined,
  scope: SketchFreeBoxMotionScope | null | undefined
): boolean {
  if (!scope?.prefix) return false;
  const rec = asRecord(entry);
  if (!rec) return false;

  const ownScope = getSketchFreeBoxMotionScopeFromEntry(rec);
  if (ownScope) {
    if (ownScope.prefix === scope.prefix) return true;
    if (ownScope.boxId === scope.boxId) {
      const a = ownScope.moduleKey || null;
      const b = scope.moduleKey || null;
      if (a === b) return true;
    }
  }

  const group = asRecord(rec.group);
  const userData = asRecord(group?.userData);
  const partCandidates = [
    readString(userData?.partId),
    readString(rec.partId),
    readString(rec.id),
    readString(rec.dividerKey),
  ];
  return partCandidates.some(
    partId => !!partId && (partId === scope.prefix || partId.startsWith(`${scope.prefix}_`))
  );
}

function collectEntryIdentityParts(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | UnknownRecord | null | undefined
): string[] {
  const rec = asRecord(entry);
  if (!rec) return [];
  const group = asRecord(rec.group);
  const userData = asRecord(group?.userData);
  const out: string[] = [];
  for (const candidate of [userData?.partId, rec.partId, rec.id, rec.dividerKey]) {
    const text = readString(candidate);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

export function isSketchFreeBoxInternalDrawerEntry(
  entry: DrawerVisualEntryLike | UnknownRecord | null | undefined
): boolean {
  if (!getSketchFreeBoxMotionScopeFromEntry(entry)) return false;
  const parts = collectEntryIdentityParts(entry);
  if (parts.some(partId => partId.includes('_int_drawers_'))) return true;
  if (parts.some(partId => partId.includes('_ext_drawers_'))) return false;
  const rec = asRecord(entry);
  return rec?.isInternal === true;
}

export function isSketchFreeBoxMotionControlledEntry(
  entry: DoorVisualEntryLike | DrawerVisualEntryLike | UnknownRecord | null | undefined
): boolean {
  return !!getSketchFreeBoxMotionScopeFromEntry(entry);
}
