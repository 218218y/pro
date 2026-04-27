import type { KernelSnapshotStoreSystem } from './kernel_snapshot_store_contracts.js';
import type { KernelSnapshotStoreCommitArgs } from './kernel_snapshot_store_commits_shared.js';

import { createKernelSnapshotStoreCommitOpsRuntime } from './kernel_snapshot_store_commits_ops.js';

export type { KernelSnapshotStoreCommitArgs } from './kernel_snapshot_store_commits_shared.js';

export function createKernelSnapshotStoreCommitOps(
  args: KernelSnapshotStoreCommitArgs
): Omit<KernelSnapshotStoreSystem, 'getBuildState'> {
  return createKernelSnapshotStoreCommitOpsRuntime(args);
}
