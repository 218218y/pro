import path from 'node:path';

export const OBSERVABILITY_BUILD_MODES = Object.freeze(['client', 'perf', 'debug']);
export const ADHESIVE_GLASS_WARMUP_MODES = Object.freeze(['startup', 'off', 'design-intent']);
export const FOLDED_GEOMETRY_MODES = Object.freeze(['exact', 'segments-2', 'canonical-scale']);
export const MIRROR_CUBE_EXPERIMENT_MODES = Object.freeze([
  'baseline',
  'defer-first-presentation',
  'first-refresh-128',
]);

export function normalizeObservabilityBuildMode(value, fallback = 'client') {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (OBSERVABILITY_BUILD_MODES.includes(raw)) return raw;
  return OBSERVABILITY_BUILD_MODES.includes(fallback) ? fallback : 'client';
}

export function normalizeAdhesiveGlassWarmupMode(value, fallback = 'startup') {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (ADHESIVE_GLASS_WARMUP_MODES.includes(raw)) return raw;
  return ADHESIVE_GLASS_WARMUP_MODES.includes(fallback) ? fallback : 'startup';
}

export function normalizeFoldedGeometryMode(value, fallback = 'canonical-scale') {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (FOLDED_GEOMETRY_MODES.includes(raw)) return raw;
  return FOLDED_GEOMETRY_MODES.includes(fallback) ? fallback : 'canonical-scale';
}

export function normalizeMirrorCubeExperimentMode(value, fallback = 'baseline') {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (MIRROR_CUBE_EXPERIMENT_MODES.includes(raw)) return raw;
  return MIRROR_CUBE_EXPERIMENT_MODES.includes(fallback) ? fallback : 'baseline';
}

export function createObservabilityBuildDefines(buildMode, options = {}) {
  const mode = normalizeObservabilityBuildMode(buildMode);
  const adhesiveGlassWarmupMode =
    mode === 'perf' ? normalizeAdhesiveGlassWarmupMode(options.adhesiveGlassWarmupMode) : 'startup';
  const foldedGeometryMode =
    mode === 'perf' ? normalizeFoldedGeometryMode(options.foldedGeometryMode) : 'canonical-scale';
  const mirrorCubeExperimentMode =
    mode === 'perf'
      ? normalizeMirrorCubeExperimentMode(options.mirrorCubeExperimentMode, 'defer-first-presentation')
      : 'defer-first-presentation';
  return {
    __WP_BUILD_CLIENT__: JSON.stringify(mode === 'client'),
    __WP_BUILD_PERF__: JSON.stringify(mode === 'perf'),
    __WP_BUILD_DEBUG__: JSON.stringify(mode === 'debug'),
    __WP_ADHESIVE_GLASS_WARMUP_MODE__: JSON.stringify(adhesiveGlassWarmupMode),
    __WP_FOLDED_GEOMETRY_MODE__: JSON.stringify(foldedGeometryMode),
    __WP_MIRROR_CUBE_EXPERIMENT__: JSON.stringify(mirrorCubeExperimentMode),
  };
}

function resolveObservabilityTargetBaseName(buildMode) {
  return normalizeObservabilityBuildMode(buildMode) === 'client'
    ? 'observability_surface_prod'
    : 'observability_surface_full';
}

function resolveSchedulerDebugStatsTargetBaseName(buildMode) {
  return normalizeObservabilityBuildMode(buildMode) === 'client'
    ? 'scheduler_debug_stats_prod'
    : 'scheduler_debug_stats_full';
}

export function createObservabilityAliasMap({ root, buildMode, useDist }) {
  const mode = normalizeObservabilityBuildMode(buildMode);
  const suffix = useDist ? 'js' : 'ts';
  const sourceRoot = path.join(root, useDist ? 'dist' : '', 'esm', 'native');
  const runtimeDir = path.join(sourceRoot, 'runtime');
  const builderDir = path.join(sourceRoot, 'builder');
  const observabilityCanonicalAbs = path.join(runtimeDir, `observability_surface.${suffix}`);
  const observabilityTargetAbs = path.join(
    runtimeDir,
    `${resolveObservabilityTargetBaseName(mode)}.${suffix}`
  );
  const schedulerStatsCanonicalAbs = path.join(builderDir, `scheduler_debug_stats.${suffix}`);
  const schedulerStatsTargetAbs = path.join(
    builderDir,
    `${resolveSchedulerDebugStatsTargetBaseName(mode)}.${suffix}`
  );
  return {
    [observabilityCanonicalAbs]: observabilityTargetAbs,
    [schedulerStatsCanonicalAbs]: schedulerStatsTargetAbs,
    './scheduler_debug_stats.js': schedulerStatsTargetAbs,
  };
}

export function resolveObservabilityBuildModeFromViteMode(mode) {
  const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() : '';
  if (normalized === 'production' || normalized === 'client') return 'client';
  if (normalized === 'perf') return 'perf';
  if (normalized === 'debug' || normalized === 'development' || normalized === 'modules') return 'debug';
  return 'debug';
}
