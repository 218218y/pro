import type { UnknownRecord } from '../../../types';

export type SlidingDoorVisibilityEntryLike = {
  group?: (UnknownRecord & { visible?: boolean; userData?: UnknownRecord | null }) | null;
};

const HIDDEN_BY_OPEN_KEY = '__wpSlidingDoorHiddenByOpen';
const BASE_VISIBLE_KEY = '__wpSlidingDoorBaseVisibleBeforeOpenHide';

function readGroup(door: SlidingDoorVisibilityEntryLike | null | undefined) {
  return door && door.group && typeof door.group === 'object' ? door.group : null;
}

function ensureUserData(group: UnknownRecord & { userData?: UnknownRecord | null }): UnknownRecord {
  if (!group.userData || typeof group.userData !== 'object') group.userData = {};
  return group.userData;
}

export function setSlidingDoorHiddenForOpenState(
  door: SlidingDoorVisibilityEntryLike | null | undefined,
  hidden: boolean
): boolean {
  const group = readGroup(door);
  if (!group) return false;

  const userData = ensureUserData(group);
  const isHiddenByOpen = userData[HIDDEN_BY_OPEN_KEY] === true;

  if (hidden) {
    if (!isHiddenByOpen) {
      userData[BASE_VISIBLE_KEY] = group.visible !== false;
      userData[HIDDEN_BY_OPEN_KEY] = true;
    }
    const changed = group.visible !== false;
    group.visible = false;
    return changed;
  }

  if (!isHiddenByOpen) return false;

  const baseVisible = typeof userData[BASE_VISIBLE_KEY] === 'boolean' ? !!userData[BASE_VISIBLE_KEY] : true;
  const changed = group.visible !== baseVisible;
  group.visible = baseVisible;
  delete userData[HIDDEN_BY_OPEN_KEY];
  delete userData[BASE_VISIBLE_KEY];
  return changed;
}
