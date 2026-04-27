export type CloudSyncMaybeAsyncPull = (force: boolean) => Promise<void> | void;
export type CloudSyncAsyncPull = (force: boolean) => Promise<void>;

export function toCloudSyncAsyncPull(pull: CloudSyncMaybeAsyncPull): CloudSyncAsyncPull {
  return (force: boolean): Promise<void> => Promise.resolve(pull(force));
}
