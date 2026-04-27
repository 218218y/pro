import type { AppContainer } from '../../../types';

import { hasOwnNumberSlots } from '../runtime/install_idempotency_patterns.js';
import { ensureRenderNamespace } from '../runtime/render_access.js';
import {
  type AppLike,
  type RenderLike,
  readRenderLike,
  hasRenderLoopTimingSlots,
} from './render_loop_impl_support.js';

const RENDER_LOOP_IMPL_TAG = '__wpRenderLoopImpl';

function hasRenderLoopImplTag(fn: Function): boolean {
  return Reflect.get(fn, RENDER_LOOP_IMPL_TAG) === true;
}

export function markInstalledRenderAnimate(fn: (time?: number) => void): (time?: number) => void {
  Reflect.set(fn, RENDER_LOOP_IMPL_TAG, true);
  return fn;
}

export function isInstalledRenderAnimate(fn: unknown): fn is (time?: number) => void {
  return typeof fn === 'function' && hasRenderLoopImplTag(fn);
}

export function hasRenderLoopInstallContract(A: AppLike): boolean {
  const render = readRenderLike(ensureRenderNamespace(A)) || {};
  return !!(
    isInstalledRenderAnimate(render.animate) &&
    hasOwnNumberSlots<RenderLike>(render, ['loopRaf', '__lastFrameTs', '__rafScheduledAt']) &&
    hasRenderLoopTimingSlots(A)
  );
}

export function getInstalledRender(root: AppLike): AppContainer['render'] {
  return ensureRenderNamespace(root);
}
