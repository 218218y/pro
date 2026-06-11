import {
  type ClearCloudSyncPublishedStateOptions,
  type CloudSyncPublishedPreservableSlot,
  type CloudSyncPublishedPreservedState,
  type CloudSyncPublishedStateLike,
  readCloudSyncDisposePublicationEpoch,
} from './cloud_sync_install_support_shared.js';

type CloudSyncPublishedPreservationSpec = {
  shouldPreserve: (
    state: CloudSyncPublishedStateLike,
    opts: Required<ClearCloudSyncPublishedStateOptions>
  ) => boolean;
  readValue: (state: CloudSyncPublishedStateLike) => unknown;
  restoreValue?: (state: CloudSyncPublishedStateLike, value: unknown) => void;
};

const CLOUD_SYNC_PUBLISHED_PRESERVABLE_ORDER = [
  'dispose',
  '__disposePublicationEpoch',
  '__testHooks',
] as const satisfies readonly CloudSyncPublishedPreservableSlot[];

const CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS: Record<
  CloudSyncPublishedPreservableSlot,
  CloudSyncPublishedPreservationSpec
> = {
  dispose: {
    shouldPreserve: (state, opts) => opts.preserveDispose && typeof state.dispose === 'function',
    readValue: state => state.dispose,
    restoreValue: (state, value) => {
      state.dispose = value;
    },
  },
  __disposePublicationEpoch: {
    shouldPreserve: (state, opts) =>
      opts.preserveDispose &&
      typeof state.dispose === 'function' &&
      readCloudSyncDisposePublicationEpoch(state) !== null,
    readValue: state => readCloudSyncDisposePublicationEpoch(state),
    restoreValue: (state, value) => {
      if (typeof value === 'number' && value > 0) state.__disposePublicationEpoch = value;
    },
  },
  __testHooks: {
    shouldPreserve: (_state, opts) => opts.preserveTestHooks,
    readValue: state => state.__testHooks,
    restoreValue: (state, value) => {
      if (typeof value !== 'undefined') state.__testHooks = value;
    },
  },
};

export function readCloudSyncPublishedPreservedState(
  state: CloudSyncPublishedStateLike,
  opts: Required<ClearCloudSyncPublishedStateOptions>
): CloudSyncPublishedPreservedState {
  const preserved: CloudSyncPublishedPreservedState = {};
  for (const key of CLOUD_SYNC_PUBLISHED_PRESERVABLE_ORDER) {
    const spec = CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS[key];
    if (!spec.shouldPreserve(state, opts)) continue;
    preserved[key] = spec.readValue(state);
  }
  return preserved;
}

export function restoreCloudSyncPublishedPreservedState(
  state: CloudSyncPublishedStateLike,
  preserved: CloudSyncPublishedPreservedState
): void {
  for (const key of CLOUD_SYNC_PUBLISHED_PRESERVABLE_ORDER) {
    const spec = CLOUD_SYNC_PUBLISHED_PRESERVATION_SPECS[key];
    if (!spec.restoreValue) continue;
    if (!(key in preserved)) continue;
    spec.restoreValue(state, preserved[key]);
  }
}
