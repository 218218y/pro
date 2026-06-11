import type {
  BuilderChestModeFollowThroughOpts,
  BuilderChestModeFollowThroughResult,
  BuilderPostBuildFollowThroughOpts,
  BuilderPostBuildFollowThroughResult,
} from './builder_service_access_build_shared.js';
import {
  runBuilderChestModeFollowThroughRuntime,
  runBuilderPostBuildFollowThroughRuntime,
} from './builder_service_access_build_followthrough_runtime.js';

export function runBuilderPostBuildFollowThrough(
  App: unknown,
  opts?: BuilderPostBuildFollowThroughOpts | null
): BuilderPostBuildFollowThroughResult {
  return runBuilderPostBuildFollowThroughRuntime(App, opts);
}

export function runBuilderChestModeFollowThrough(
  App: unknown,
  opts?: BuilderChestModeFollowThroughOpts | null
): BuilderChestModeFollowThroughResult {
  return runBuilderChestModeFollowThroughRuntime(App, opts);
}
