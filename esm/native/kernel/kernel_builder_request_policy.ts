import type { AppContainer } from '../../../types';

import type {
  KernelBuilderRequestMeta,
  KernelBuilderRequestPolicyOpts,
} from './kernel_builder_request_policy_shared.js';
import {
  readKernelBuilderRequestForce as readKernelBuilderRequestForceInternal,
  readKernelBuilderRequestImmediate as readKernelBuilderRequestImmediateInternal,
  readKernelBuilderRequestSource as readKernelBuilderRequestSourceInternal,
  shouldRequestKernelBuilderBuild as shouldRequestKernelBuilderBuildInternal,
} from './kernel_builder_request_policy_shared.js';
import { requestKernelBuilderBuild as requestKernelBuilderBuildInternal } from './kernel_builder_request_policy_request.js';

export type { KernelBuilderRequestMeta, KernelBuilderRequestPolicyOpts };

export function readKernelBuilderRequestSource(meta: KernelBuilderRequestMeta, fallback = 'kernel'): string {
  return readKernelBuilderRequestSourceInternal(meta, fallback);
}

export function readKernelBuilderRequestForce(meta: KernelBuilderRequestMeta, fallback = false): boolean {
  return readKernelBuilderRequestForceInternal(meta, fallback);
}

export function readKernelBuilderRequestImmediate(meta: KernelBuilderRequestMeta, fallback = false): boolean {
  return readKernelBuilderRequestImmediateInternal(meta, fallback);
}

export function shouldRequestKernelBuilderBuild(
  meta: KernelBuilderRequestMeta,
  forceFallback = false
): boolean {
  return shouldRequestKernelBuilderBuildInternal(meta, forceFallback);
}

export function requestKernelBuilderBuild(
  App: AppContainer,
  meta: KernelBuilderRequestMeta,
  opts?: KernelBuilderRequestPolicyOpts | null
): boolean {
  return requestKernelBuilderBuildInternal(App, meta, opts);
}
