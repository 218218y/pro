import type { CloudSyncRoomModeCommandResult } from '../../../types';

import { normalizeUnknownError } from '../runtime/error_normalization.js';

import {
  buildCloudSyncShareLink,
  readRoomString,
  type CloudSyncRoomCommandDeps,
  type CloudSyncRoomMode,
} from './cloud_sync_room_commands_shared.js';

function buildPrivateRoomValue(deps: CloudSyncRoomCommandDeps, currentRoom: string): string {
  const current = readRoomString(currentRoom);
  const publicRoom = readRoomString(deps.cfg.publicRoom);
  if (current && current !== publicRoom) return current;

  let next = readRoomString(deps.getPrivateRoom());
  if (!next) next = readRoomString(deps.cfg.privateRoom);
  if (!next) next = readRoomString(deps.randomRoomId());
  if (next) deps.setPrivateRoom(next);
  return next;
}

export function runCloudSyncRoomModeCommand(
  deps: CloudSyncRoomCommandDeps,
  mode: CloudSyncRoomMode
): CloudSyncRoomModeCommandResult {
  const currentRoom = readRoomString(deps.getCurrentRoom());
  const publicRoom = readRoomString(deps.cfg.publicRoom) || 'public';
  const targetMode: CloudSyncRoomMode = mode === 'private' ? 'private' : 'public';
  const targetRoom = targetMode === 'public' ? publicRoom : buildPrivateRoomValue(deps, currentRoom);
  const changed = targetMode === 'public' ? currentRoom !== publicRoom : currentRoom !== targetRoom;
  const shareLink = buildCloudSyncShareLink(deps.cfg, targetRoom);

  try {
    deps.setRoomInUrl(deps.App, deps.cfg.roomParam, targetMode === 'public' ? null : targetRoom || null);
    return {
      ok: true,
      changed,
      mode: targetMode,
      room: targetRoom,
      shareLink,
    };
  } catch (err) {
    deps.reportNonFatal(deps.App, 'services/cloud_sync.ts:roomMode', err, { throttleMs: 4000 });
    return {
      ok: false,
      changed,
      mode: targetMode,
      room: targetRoom,
      shareLink,
      reason: 'error',
      message: normalizeUnknownError(err, 'החלפת מצב הסנכרון נכשלה').message,
    };
  }
}
