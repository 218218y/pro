import {
  type CloudSyncInstallRuntime,
  type CloudSyncInstallRuntimeArgs,
} from './cloud_sync_install_runtime_shared.js';
import { createCloudSyncInstallRuntimeOps } from './cloud_sync_install_runtime_ops.js';
import { installCloudSyncInstallRuntimePanelApi } from './cloud_sync_install_runtime_panel.js';

export function createCloudSyncInstallRuntime(args: CloudSyncInstallRuntimeArgs): CloudSyncInstallRuntime {
  const runtime = createCloudSyncInstallRuntimeOps(args);
  installCloudSyncInstallRuntimePanelApi(args, runtime);
  return runtime;
}
