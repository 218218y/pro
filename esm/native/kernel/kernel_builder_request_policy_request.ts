import type { AppContainer } from '../../../types';

import { requestBuilderBuildFromActionMeta } from '../runtime/builder_service_access.js';

import type {
  KernelBuilderRequestMeta,
  KernelBuilderRequestPolicyOpts,
} from './kernel_builder_request_policy_shared.js';
import { resolveKernelBuilderRequestPolicy } from './kernel_builder_request_policy_shared.js';

export function requestKernelBuilderBuild(
  App: AppContainer,
  meta: KernelBuilderRequestMeta,
  opts?: KernelBuilderRequestPolicyOpts | null
): boolean {
  const resolved = resolveKernelBuilderRequestPolicy(meta, opts);
  if (!resolved.shouldRequestBuild) return false;

  return requestBuilderBuildFromActionMeta(App, resolved.metaRecord, {
    source: resolved.source,
    reason: resolved.reason,
    immediate: resolved.immediate,
    force: resolved.force,
  });
}
