import type { AppContainer, BuildStateLike, BuilderServiceLike } from '../../../types/index.js';

import { isBootReady as isAppBootReady, isLifecycleBootReady } from '../runtime/app_roots_access.js';
import { getBuilderBuildWardrobe, hasBuilderBuildWardrobe } from '../runtime/builder_service_access.js';

export type BuilderCoreLike = BuilderServiceLike & {
  buildWardrobe?: (state: BuildStateLike) => unknown;
};

export function isBootReady(App: AppContainer): boolean {
  return isAppBootReady(App) || isLifecycleBootReady(App);
}

export function getBuilderCore(App: AppContainer): BuilderCoreLike | null {
  const buildWardrobe = getBuilderBuildWardrobe(App);
  return typeof buildWardrobe === 'function' ? { buildWardrobe } : null;
}

export function hasBuilder(App: AppContainer): boolean {
  return hasBuilderBuildWardrobe(App);
}

export function callBuild(App: AppContainer, state: BuildStateLike): unknown {
  const buildWardrobe = getBuilderBuildWardrobe(App);
  return typeof buildWardrobe === 'function' ? buildWardrobe(state) : null;
}
