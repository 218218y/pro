import type {
  AppContainer,
  CloudSyncCredentialIssueResult,
  CloudSyncFetchLike,
  CloudSyncGatewayFailure,
  CloudSyncRoomCredential,
  CloudSyncRuntimeStatus,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import {
  createPrivateRoomCredential,
  issuePublicRoomCredential,
  renewPrivateRoomCredential,
} from './cloud_sync_gateway.js';
import type { CloudSyncOwnerRooms } from './cloud_sync_owner_context_rooms.js';
import {
  buildCloudSyncCredentialStatus,
  classifyCloudSyncCredential,
} from './cloud_sync_room_credentials.js';

export type CloudSyncOwnerCredentialSession = {
  resolveRoomCredential: (room: string) => Promise<CloudSyncRoomCredential | null>;
  issuePrivateRoom: () => Promise<CloudSyncCredentialIssueResult>;
  publishSuccess: (credential: CloudSyncRoomCredential) => void;
  publishFailure: (credential: CloudSyncRoomCredential | null, failure: CloudSyncGatewayFailure) => void;
  readLastFailure: () => CloudSyncGatewayFailure | null;
  missingCredentialFailure: () => CloudSyncGatewayFailure;
};

export function createCloudSyncOwnerCredentialSession(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  gatewayUrl: string;
  rooms: CloudSyncOwnerRooms;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  fetchFn: CloudSyncFetchLike;
}): CloudSyncOwnerCredentialSession {
  const { cfg, gatewayUrl, rooms, runtimeStatus, publishStatus, fetchFn } = args;
  let publicCredential: CloudSyncRoomCredential | null = null;
  let publicCredentialPromise: Promise<CloudSyncRoomCredential | null> | null = null;
  let privateCredentialPromise: Promise<CloudSyncRoomCredential | null> | null = null;
  let privateCredentialMemory: CloudSyncRoomCredential | null = null;
  let expiredPrivateRoom = '';
  let lastCredentialFailure: CloudSyncGatewayFailure | null = null;

  const missingCredentialFailure = (): CloudSyncGatewayFailure => ({
    kind: 'auth-invalid',
    status: 403,
    code: 'credential_missing',
  });

  const publishCredentialStatus = (
    credential: CloudSyncRoomCredential | null,
    failure: CloudSyncGatewayFailure | null = null
  ): void => {
    if (failure?.kind === 'room-expired' && rooms.currentRoom() !== cfg.publicRoom) {
      const expiredRoom = credential?.room || rooms.currentRoom();
      const firstObservation = expiredPrivateRoom !== expiredRoom;
      expiredPrivateRoom = expiredRoom;
      privateCredentialMemory = null;
      if (firstObservation) rooms.clearPrivateRoomCredential();
      credential = null;
    }
    lastCredentialFailure = failure;
    runtimeStatus.credential = buildCloudSyncCredentialStatus({
      isPublic: rooms.currentRoom() === cfg.publicRoom,
      credential,
      failure,
    });
    if (failure) runtimeStatus.lastError = `credential:${failure.kind}`;
    else if (runtimeStatus.lastError.startsWith('credential:')) runtimeStatus.lastError = '';
    publishStatus();
  };

  const isCredentialUsable = (credential: CloudSyncRoomCredential | null): boolean => {
    const expiresAt = credential ? Date.parse(credential.expiresAt) : Number.NaN;
    return !!credential?.token && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000;
  };

  const readActiveRateLimitFailure = (): CloudSyncGatewayFailure | null => {
    const status = runtimeStatus.credential;
    const retryAt = Number(status?.retryAt) || 0;
    const remainingMs = retryAt - Date.now();
    if (status?.state !== 'rate-limited' || remainingMs <= 0) return null;
    return {
      kind: 'rate-limit',
      status: 429,
      code: 'rate_limit',
      retryAfterMs: remainingMs,
    };
  };

  const resolvePublicCredential = async (): Promise<CloudSyncRoomCredential | null> => {
    if (isCredentialUsable(publicCredential)) return publicCredential;
    if (!publicCredentialPromise) {
      publicCredentialPromise = issuePublicRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
      }).then(result => {
        if (result.ok === false) {
          publishCredentialStatus(null, result.failure);
          return null;
        }
        return result.credential;
      });
    }
    const pending = publicCredentialPromise;
    const credential = await pending;
    if (publicCredentialPromise === pending) publicCredentialPromise = null;
    publicCredential = isCredentialUsable(credential) ? credential : null;
    if (publicCredential) publishCredentialStatus(publicCredential);
    return publicCredential;
  };

  const renewPrivateCredential = async (
    credential: CloudSyncRoomCredential
  ): Promise<CloudSyncRoomCredential | null> => {
    if (!privateCredentialPromise) {
      privateCredentialPromise = renewPrivateRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
        room: credential.room,
        roomToken: credential.token,
      }).then(result => {
        if (result.ok === false) {
          publishCredentialStatus(credential, result.failure);
          return null;
        }
        expiredPrivateRoom = '';
        privateCredentialMemory = result.credential;
        rooms.setPrivateRoomCredential(result.credential);
        publishCredentialStatus(result.credential);
        return result.credential;
      });
    }
    const pending = privateCredentialPromise;
    const renewed = await pending;
    if (privateCredentialPromise === pending) privateCredentialPromise = null;
    return renewed;
  };

  const resolveRoomCredential = async (room: string): Promise<CloudSyncRoomCredential | null> => {
    const rateLimitFailure = readActiveRateLimitFailure();
    if (rateLimitFailure) {
      lastCredentialFailure = rateLimitFailure;
      return null;
    }
    const baseRoom = rooms.currentRoom();
    if (!baseRoom || (room !== baseRoom && !room.startsWith(`${baseRoom}::`))) {
      publishCredentialStatus(null, missingCredentialFailure());
      return null;
    }
    if (baseRoom === cfg.publicRoom) return resolvePublicCredential();
    if (expiredPrivateRoom === baseRoom) {
      publishCredentialStatus(null, { kind: 'room-expired', status: 410, code: 'room_expired' });
      return null;
    }
    const storedCredential = rooms.currentRoomCredential();
    const memoryExpiry = Date.parse(privateCredentialMemory?.expiresAt || '');
    const storedExpiry = Date.parse(storedCredential?.expiresAt || '');
    const memoryExpiresAt = Number.isFinite(memoryExpiry) ? memoryExpiry : Number.NEGATIVE_INFINITY;
    const storedExpiresAt = Number.isFinite(storedExpiry) ? storedExpiry : Number.NEGATIVE_INFINITY;
    const credential =
      privateCredentialMemory?.room === baseRoom && memoryExpiresAt > storedExpiresAt
        ? privateCredentialMemory
        : storedCredential;
    const state = classifyCloudSyncCredential(credential);
    if (!credential || state === 'missing' || state === 'expired') {
      publishCredentialStatus(
        credential,
        state === 'expired'
          ? { kind: 'auth-expired', status: 403, code: 'room_token_expired' }
          : missingCredentialFailure()
      );
      return null;
    }
    if (state === 'expiring') return renewPrivateCredential(credential);
    publishCredentialStatus(credential);
    return credential;
  };

  return {
    resolveRoomCredential,
    issuePrivateRoom: async () => {
      const result = await createPrivateRoomCredential({
        fetchFn,
        gatewayUrl,
        anonKey: cfg.anonKey,
        storeId: cfg.storeId,
      });
      if (result.ok === false) {
        publishCredentialStatus(null, result.failure);
        return result;
      }
      expiredPrivateRoom = '';
      publishCredentialStatus(result.credential);
      return result;
    },
    publishSuccess(credential) {
      publishCredentialStatus(credential);
    },
    publishFailure(credential, failure) {
      publishCredentialStatus(credential, failure);
    },
    readLastFailure() {
      return lastCredentialFailure;
    },
    missingCredentialFailure,
  };
}
