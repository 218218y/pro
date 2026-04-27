import type { AppContainer, ConfigCompoundsServiceLike } from '../../../types';

import { getBootFlags } from '../runtime/internal_state.js';
import { ensureConfigCompoundsService } from '../runtime/config_compounds_access.js';
import { isConfigCompoundsInstalled, markConfigCompoundsInstalled } from '../runtime/install_state_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

import { cloneSeedOptions, type ConfigCompoundsSeedOptions } from './config_compounds_shared.js';
import { isConfigCompoundsSeeded, seedConfigCompounds } from './config_compounds_seed.js';

type ConfigCompoundsServiceWithCanonicalRefs = ConfigCompoundsServiceLike & {
  __wpSeed?: ConfigCompoundsServiceLike['seed'];
  __wpIsSeeded?: ConfigCompoundsServiceLike['isSeeded'];
};

const configCompoundsInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function resolveConfigCompoundsInstallContext(
  service: ConfigCompoundsServiceWithCanonicalRefs,
  App: AppContainer
): InstallContext<AppContainer> {
  return resolveInstallContext(configCompoundsInstallContexts, service, App);
}

function installConfigCompoundsSurface(
  App: AppContainer,
  opts: ConfigCompoundsSeedOptions | undefined
): ConfigCompoundsServiceLike {
  const service = ensureConfigCompoundsService(App) as ConfigCompoundsServiceWithCanonicalRefs;
  const context = resolveConfigCompoundsInstallContext(service, App);
  installStableSurfaceMethod(service, 'seed', '__wpSeed', () => {
    return (nextOpts?: ConfigCompoundsSeedOptions) =>
      seedConfigCompounds(context.App, cloneSeedOptions(nextOpts ?? service.options));
  });
  installStableSurfaceMethod(service, 'isSeeded', '__wpIsSeeded', () => {
    return () => isConfigCompoundsSeeded(context.App);
  });
  service.options = cloneSeedOptions(opts);
  if (!isConfigCompoundsInstalled(App)) markConfigCompoundsInstalled(App);
  return service;
}

export function installConfigCompoundsService(
  App: AppContainer,
  opts: ConfigCompoundsSeedOptions | undefined = undefined
): ConfigCompoundsServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installConfigCompoundsService(App): App is required');

  getBootFlags(App);

  const service = installConfigCompoundsSurface(App, opts);

  try {
    seedConfigCompounds(App, opts);
  } catch {
    // ignore
  }

  return service;
}
