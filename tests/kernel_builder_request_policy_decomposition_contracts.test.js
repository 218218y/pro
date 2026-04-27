import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const kernelBuilderRequestPolicyOwner = readSource(
  '../esm/native/kernel/kernel_builder_request_policy.ts',
  import.meta.url
);
const kernelBuilderRequestSharedOwner = readSource(
  '../esm/native/kernel/kernel_builder_request_policy_shared.ts',
  import.meta.url
);
const kernelBuilderRequestRequestOwner = readSource(
  '../esm/native/kernel/kernel_builder_request_policy_request.ts',
  import.meta.url
);

test('[kernel-builder-request-policy] public owner stays thin while shared readers and request dispatch live in dedicated owners', () => {
  assertMatchesAll(
    assert,
    kernelBuilderRequestPolicyOwner,
    [
      /from '\.\/kernel_builder_request_policy_shared\.js';/,
      /from '\.\/kernel_builder_request_policy_request\.js';/,
      /export function shouldRequestKernelBuilderBuild\(/,
      /export function requestKernelBuilderBuild\(/,
    ],
    'kernelBuilderRequestPolicyOwner'
  );
  assertLacksAll(
    assert,
    kernelBuilderRequestPolicyOwner,
    [
      /function readKernelBuilderRequestString\(/,
      /function readKernelBuilderRequestBoolean\(/,
      /requestBuilderBuildFromActionMeta\(/,
      /resolveKernelBuilderRequestPolicy\(/,
    ],
    'kernelBuilderRequestPolicyOwner'
  );
});

test('[kernel-builder-request-policy] dedicated owners hold canonical readers, resolution, and build dispatch logic', () => {
  assertMatchesAll(
    assert,
    kernelBuilderRequestSharedOwner,
    [
      /export function readKernelBuilderRequestSource\(/,
      /export function readKernelBuilderRequestForce\(/,
      /export function readKernelBuilderRequestImmediate\(/,
      /export function shouldRequestKernelBuilderBuild\(/,
      /export function resolveKernelBuilderRequestPolicy\(/,
    ],
    'kernelBuilderRequestSharedOwner'
  );
  assertMatchesAll(
    assert,
    kernelBuilderRequestRequestOwner,
    [
      /export function requestKernelBuilderBuild\(/,
      /resolveKernelBuilderRequestPolicy\(/,
      /requestBuilderBuildFromActionMeta\(/,
    ],
    'kernelBuilderRequestRequestOwner'
  );
});
