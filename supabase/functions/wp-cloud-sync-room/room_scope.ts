export type CloudSyncRoomScopeClaims = {
  tenantId: string;
  storeId: string;
  room: string;
};

export const CLOUD_SYNC_ALLOWED_ROOM_PATHS = Object.freeze([
  '',
  '::sketch',
  '::sketch::toMain',
  '::sketch::toSite2',
  '::tabsGate',
  '::syncPin',
  '::showContents',
] as const);

const ALLOWED_ROOM_PATHS = new Set<string>(CLOUD_SYNC_ALLOWED_ROOM_PATHS);

export function isCloudSyncRoomAuthorized(
  claims: CloudSyncRoomScopeClaims,
  room: string,
  storeId: string,
  tenantId: string
): boolean {
  if (claims.storeId !== storeId || claims.tenantId !== tenantId) return false;
  if (room === claims.room) return true;
  if (!room.startsWith(`${claims.room}::`)) return false;
  return ALLOWED_ROOM_PATHS.has(room.slice(claims.room.length));
}
