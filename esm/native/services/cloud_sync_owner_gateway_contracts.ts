import type {
  CloudSyncConflictResolution,
  CloudSyncConflictResolutionResult,
  CloudSyncCredentialIssueResult,
  CloudSyncGatewayReadResult,
  CloudSyncPayload,
  CloudSyncRemoteAdoptionResult,
  CloudSyncStateRow,
  CloudSyncUpsertResult,
  CloudSyncUpsertRowOptions,
} from '../../../types';

export type CloudSyncConflictLocalSnapshot = {
  payload: CloudSyncPayload;
  revision: number;
};

export type CloudSyncGetRowFn = (
  gatewayUrlIn: string,
  anonKeyIn: string,
  roomIn: string
) => Promise<CloudSyncGatewayReadResult>;

export type CloudSyncUpsertRowFn = (
  gatewayUrlIn: string,
  anonKeyIn: string,
  roomIn: string,
  payloadIn: CloudSyncPayload,
  options?: CloudSyncUpsertRowOptions
) => Promise<CloudSyncUpsertResult>;

export type CloudSyncIssuePrivateRoomFn = () => Promise<CloudSyncCredentialIssueResult>;

export type CloudSyncResolveConflictFn = (
  room: string,
  resolution: CloudSyncConflictResolution,
  adoptRemote: (
    row: CloudSyncStateRow,
    expectedLocalRevision: number
  ) => Promise<CloudSyncRemoteAdoptionResult>,
  readLocalSnapshot: () => CloudSyncConflictLocalSnapshot,
  expectedConflictId?: string
) => Promise<CloudSyncConflictResolutionResult>;

export type CloudSyncOwnerGatewayIo = {
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  issuePrivateRoom: CloudSyncIssuePrivateRoomFn;
  resolveConflict: CloudSyncResolveConflictFn;
};
