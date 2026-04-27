import path from 'node:path';

export const OBSERVABILITY_BUILD_MODES = Object.freeze(['client', 'perf', 'debug']);

export function normalizeObservabilityBuildMode(value, fallback = 'client') {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (OBSERVABILITY_BUILD_MODES.includes(raw)) return raw;
  return OBSERVABILITY_BUILD_MODES.includes(fallback) ? fallback : 'client';
}

export function createObservabilityBuildDefines(buildMode) {
  const mode = normalizeObservabilityBuildMode(buildMode);
  return {
    __WP_BUILD_CLIENT__: JSON.stringify(mode === 'client'),
    __WP_BUILD_PERF__: JSON.stringify(mode === 'perf'),
    __WP_BUILD_DEBUG__: JSON.stringify(mode === 'debug'),
  };
}

function resolveObservabilityTargetBaseName(buildMode) {
  return normalizeObservabilityBuildMode(buildMode) === 'client'
    ? 'observability_surface_prod'
    : 'observability_surface_full';
}

export function createObservabilityAliasMap({ root, buildMode, useDist }) {
  const mode = normalizeObservabilityBuildMode(buildMode);
  const suffix = useDist ? 'js' : 'ts';
  const baseDir = path.join(root, useDist ? 'dist' : '', 'esm', 'native', 'runtime');
  const canonicalAbs = path.join(baseDir, `observability_surface.${suffix}`);
  const targetAbs = path.join(baseDir, `${resolveObservabilityTargetBaseName(mode)}.${suffix}`);
  return {
    [canonicalAbs]: targetAbs,
  };
}

export function resolveObservabilityBuildModeFromViteMode(mode) {
  const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  if (normalized === 'production' || normalized === 'client') return 'client';
  if (normalized === 'perf') return 'perf';
  if (normalized === 'debug' || normalized === 'development' || normalized === 'modules') return 'debug';
  return 'debug';
}
