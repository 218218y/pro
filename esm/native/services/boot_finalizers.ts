// Native ESM implementation of final boot-time shims.
//
// Goals:
// - No `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Installs boot conveniences on `App.services.commands` and hydrates
//   primary mode UI once on boot.

import type { AppContainer, CommandsServiceLike, UnknownRecord } from '../../../types';

import { getBootFlags } from '../runtime/internal_state.js';
import { setBuildTag, setSlidingDoorsFixTag } from '../runtime/build_info_access.js';
import { cleanGroupViaPlatform } from '../runtime/platform_access.js';
import { ensureCommandsService, getCommandsServiceMaybe } from '../runtime/commands_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

// (No ready-registry)
import {
  requestBuilderDebouncedBuild,
  requestBuilderForcedBuild,
} from '../runtime/builder_service_access.js';

const COMMANDS_REBUILD_CANONICAL_KEY = '__wpCanonicalRebuildWardrobe';
const COMMANDS_REBUILD_DEBOUNCED_CANONICAL_KEY = '__wpCanonicalRebuildWardrobeDebounced';
const COMMANDS_CLEAN_GROUP_CANONICAL_KEY = '__wpCanonicalCleanGroup';

type MutableCommandsService = CommandsServiceLike & UnknownRecord;

const bootFinalizerInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function resolveBootFinalizerInstallContext(
  commands: MutableCommandsService,
  App: AppContainer
): InstallContext<AppContainer> {
  return resolveInstallContext(bootFinalizerInstallContexts, commands, App);
}

export function ensureBuildTags(App: AppContainer): void {
  if (!App || typeof App !== 'object') return;

  // Diagnostics build tags (non-functional; useful for cache/version debugging)
  try {
    setSlidingDoorsFixTag(App, 'step12_stage13_fix17_internal_drawers_close_delay_2026-01-07');
  } catch (_) {}

  try {
    setBuildTag(App, 'core', 'fix47_stage10_step7_remove_app_data');
  } catch (_) {}
}

export function wardrobeRebuild(App: AppContainer): void {
  try {
    requestBuilderForcedBuild(App, { reason: 'wardrobe.rebuild' });
  } catch (_) {}
}

export function wardrobeRebuildDebounced(App: AppContainer): void {
  try {
    requestBuilderDebouncedBuild(App, { reason: 'wardrobe.rebuildDebounced' });
  } catch (_) {}
}

export function wardrobeClean(App: AppContainer, group: unknown): unknown {
  try {
    if (cleanGroupViaPlatform(App, group)) return group;
  } catch (_) {}
  return undefined;
}

function ensureCanonicalCommandsSurface(App: AppContainer, c: MutableCommandsService): void {
  const context = resolveBootFinalizerInstallContext(c, App);

  installStableSurfaceMethod(
    c,
    'rebuildWardrobe',
    COMMANDS_REBUILD_CANONICAL_KEY,
    () => () => wardrobeRebuild(context.App)
  );
  installStableSurfaceMethod(
    c,
    'rebuildWardrobeDebounced',
    COMMANDS_REBUILD_DEBOUNCED_CANONICAL_KEY,
    () => () => wardrobeRebuildDebounced(context.App)
  );
  installStableSurfaceMethod(c, 'cleanGroup', COMMANDS_CLEAN_GROUP_CANONICAL_KEY, () => {
    return (group: unknown) => wardrobeClean(context.App, group);
  });
}

/**
 * @param {AppContainer} App
 * @returns {any}
 */
export function installBootFinalizers(App: AppContainer): CommandsServiceLike | null {
  if (!App || typeof App !== 'object') throw new Error('installBootFinalizers(App): App is required');
  const boot = getBootFlags(App);
  if (!boot.bootFinalizersInstalled) boot.bootFinalizersInstalled = true;

  ensureBuildTags(App);
  // Public convenience API: commands (no App.* shims)
  try {
    const c: MutableCommandsService = ensureCommandsService(App);
    ensureCanonicalCommandsSurface(App, c);
  } catch (_) {}

  // Primary mode UI effects are store-driven (React-only); no imperative hydration needed.

  try {
    return getCommandsServiceMaybe(App) || null;
  } catch (_) {
    return null;
  }
}
