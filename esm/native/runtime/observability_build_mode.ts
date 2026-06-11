export type ObservabilityBuildMode = 'client' | 'perf' | 'debug';

function isDefinedTrue(name: 'client' | 'perf' | 'debug'): boolean {
  if (name === 'client') return typeof __WP_BUILD_CLIENT__ !== 'undefined' && __WP_BUILD_CLIENT__ === true;
  if (name === 'perf') return typeof __WP_BUILD_PERF__ !== 'undefined' && __WP_BUILD_PERF__ === true;
  return typeof __WP_BUILD_DEBUG__ !== 'undefined' && __WP_BUILD_DEBUG__ === true;
}

export function getObservabilityBuildMode(): ObservabilityBuildMode {
  if (isDefinedTrue('debug')) return 'debug';
  if (isDefinedTrue('perf')) return 'perf';
  if (isDefinedTrue('client')) return 'client';
  return 'debug';
}

export function isClientObservabilityBuild(): boolean {
  return getObservabilityBuildMode() === 'client';
}

export function isPerfObservabilityBuild(): boolean {
  return getObservabilityBuildMode() === 'perf';
}

export function isDebugObservabilityBuild(): boolean {
  return getObservabilityBuildMode() === 'debug';
}
