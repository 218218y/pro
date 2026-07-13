import type { CloudSyncRoomModeCommandResult } from '../../../types';

import { normalizeUnknownError } from '../runtime/error_normalization.js';

import {
  buildCloudSyncShareLink,
  readRoomString,
  type CloudSyncRoomCommandDeps,
  type CloudSyncRoomMode,
} from './cloud_sync_room_commands_shared.js';

async function resolvePrivateRoomCredential(
  deps: CloudSyncRoomCommandDeps,
  currentRoom: string
): Promise<{ room: string; token: string } | null> {
  const current = readRoomString(currentRoom);
  const publicRoom = readRoomString(deps.cfg.publicRoom);
  const currentToken = readRoomString(deps.getCurrentRoomToken());
  if (current && current !== publicRoom && currentToken) return { room: current, token: currentToken };

  const storedRoom = readRoomString(deps.getPrivateRoom());
  const storedToken = readRoomString(deps.getPrivateRoomToken());
  if (storedRoom && storedToken) return { room: storedRoom, token: storedToken };

  const issued = await deps.issuePrivateRoom();
  const room = readRoomString(issued?.room);
  const token = readRoomString(issued?.token);
  if (!room || !token) return null;
  deps.setPrivateRoomCredential(room, token);
  return { room, token };
}

export async function runCloudSyncRoomModeCommand(
  deps: CloudSyncRoomCommandDeps,
  mode: CloudSyncRoomMode
): Promise<CloudSyncRoomModeCommandResult> {
  const currentRoom = readRoomString(deps.getCurrentRoom());
  const publicRoom = readRoomString(deps.cfg.publicRoom) || 'public';
  const targetMode: CloudSyncRoomMode = mode === 'private' ? 'private' : 'public';
  const privateCredential =
    targetMode === 'private' ? await resolvePrivateRoomCredential(deps, currentRoom) : null;
  if (targetMode === 'private' && !privateCredential) {
    return { ok: false, mode: targetMode, reason: 'error', message: 'Failed to issue a private room token' };
  }
  const targetRoom = targetMode === 'public' ? publicRoom : privateCredential?.room || '';
  const targetToken = targetMode === 'public' ? '' : privateCredential?.token || '';
  const changed = targetMode === 'public' ? currentRoom !== publicRoom : currentRoom !== targetRoom;
  const shareLink = buildCloudSyncShareLink(deps.cfg, targetRoom, targetToken);

  try {
    const navigated = deps.setRoomCredentialInUrl(deps.App, {
      roomParam: deps.cfg.roomParam,
      room: targetMode === 'public' ? null : targetRoom || null,
      roomTokenParam: deps.cfg.roomTokenParam,
      roomToken: targetMode === 'public' ? null : targetToken || null,
    });
    if (!navigated) throw new Error('Cloud Sync room navigation was not committed');
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
