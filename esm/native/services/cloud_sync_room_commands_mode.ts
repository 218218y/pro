import type { CloudSyncCredentialIssueResult, CloudSyncRoomModeCommandResult } from '../../../types';

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
): Promise<CloudSyncCredentialIssueResult> {
  const current = readRoomString(currentRoom);
  const publicRoom = readRoomString(deps.cfg.publicRoom);
  const currentCredential = deps.getCurrentRoomCredential();
  if (current && current !== publicRoom && currentCredential?.room === current) {
    return { ok: true, credential: currentCredential };
  }

  const storedCredential = deps.getPrivateRoomCredential();
  if (storedCredential) return { ok: true, credential: storedCredential };

  const issued = await deps.issuePrivateRoom();
  if (issued.ok === false) return issued;
  const room = readRoomString(issued.credential.room);
  const token = readRoomString(issued.credential.token);
  const expiresAt = readRoomString(issued.credential.expiresAt);
  if (!room || !token || !expiresAt) {
    return {
      ok: false,
      failure: { kind: 'server', status: 500, code: 'invalid_issued_credential' },
    };
  }
  const credential = { room, token, expiresAt };
  if (!deps.setPrivateRoomCredential(credential)) {
    return {
      ok: false,
      failure: { kind: 'server', status: 500, code: 'credential_persist_failed' },
    };
  }
  return { ok: true, credential };
}

export async function runCloudSyncRoomModeCommand(
  deps: CloudSyncRoomCommandDeps,
  mode: CloudSyncRoomMode
): Promise<CloudSyncRoomModeCommandResult> {
  const currentRoom = readRoomString(deps.getCurrentRoom());
  const publicRoom = readRoomString(deps.cfg.publicRoom) || 'public';
  const targetMode: CloudSyncRoomMode = mode === 'private' ? 'private' : 'public';
  const privateCredentialResult =
    targetMode === 'private' ? await resolvePrivateRoomCredential(deps, currentRoom) : null;
  if (privateCredentialResult?.ok === false) {
    return {
      ok: false,
      mode: targetMode,
      reason: 'error',
      message: `Failed to issue a private room token (${privateCredentialResult.failure.kind})`,
      failure: privateCredentialResult.failure,
    };
  }
  const privateCredential = privateCredentialResult?.ok ? privateCredentialResult.credential : null;
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
