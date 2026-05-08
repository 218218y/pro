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

export function readKernelBuilderRequestSource(
  meta: KernelBuilderRequestMeta,
  defaultSource = 'kernel'
): string {
  return readKernelBuilderRequestSourceInternal(meta, defaultSource);
}

export function readKernelBuilderRequestForce(meta: KernelBuilderRequestMeta, defaultForce = false): boolean {
  return readKernelBuilderRequestForceInternal(meta, defaultForce);
}

export function readKernelBuilderRequestImmediate(
  meta: KernelBuilderRequestMeta,
  defaultImmediate = false
): boolean {
  return readKernelBuilderRequestImmediateInternal(meta, defaultImmediate);
}

export function shouldRequestKernelBuilderBuild(
  meta: KernelBuilderRequestMeta,
  defaultForce = false
): boolean {
  return shouldRequestKernelBuilderBuildInternal(meta, defaultForce);
}

export function requestKernelBuilderBuild(
  App: AppContainer,
  meta: KernelBuilderRequestMeta,
  opts?: KernelBuilderRequestPolicyOpts | null
): boolean {
  return requestKernelBuilderBuildInternal(App, meta, opts);
}
