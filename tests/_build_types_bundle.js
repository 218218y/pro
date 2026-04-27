import { bundleSources, normalizeWhitespace } from './_source_bundle.js';

export const BUILD_TYPE_PATHS = [
  '../types/build.ts',
  '../types/build_builder.ts',
  '../types/build_runtime.ts',
  '../types/build_state.ts',
  '../types/build_ops.ts',
];

export function readBuildTypesBundle(baseUrl = import.meta.url) {
  return bundleSources(BUILD_TYPE_PATHS, baseUrl);
}

export function readBuildTypesBundleNormalized(baseUrl = import.meta.url) {
  return normalizeWhitespace(readBuildTypesBundle(baseUrl));
}
