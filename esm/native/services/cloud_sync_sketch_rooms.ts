import type { SiteVariant } from './site_variant.js';

const SKETCH_ROOM_SUFFIX = '::sketch';
const SKETCH_TO_MAIN_SUFFIX = '::toMain';
const SKETCH_TO_SITE2_SUFFIX = '::toSite2';

function normalizeBaseRoom(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export type CloudSyncSketchRooms = {
  pushRoom: string;
  pullRoom: string;
  localVariant: SiteVariant;
  targetVariant: SiteVariant;
};

export function buildCloudSyncSketchRoom(baseRoom: string, targetVariant: SiteVariant): string {
  const normalizedBaseRoom = normalizeBaseRoom(baseRoom);
  if (!normalizedBaseRoom) return '';
  return `${normalizedBaseRoom}${SKETCH_ROOM_SUFFIX}${targetVariant === 'site2' ? SKETCH_TO_SITE2_SUFFIX : SKETCH_TO_MAIN_SUFFIX}`;
}

export function resolveCloudSyncSketchRooms(baseRoom: string, isSite2: boolean): CloudSyncSketchRooms {
  const localVariant: SiteVariant = isSite2 ? 'site2' : 'main';
  const targetVariant: SiteVariant = isSite2 ? 'main' : 'site2';
  return {
    pushRoom: buildCloudSyncSketchRoom(baseRoom, targetVariant),
    pullRoom: buildCloudSyncSketchRoom(baseRoom, localVariant),
    localVariant,
    targetVariant,
  };
}

export { SKETCH_ROOM_SUFFIX, SKETCH_TO_MAIN_SUFFIX, SKETCH_TO_SITE2_SUFFIX };
