// Native ESM implementation of the render loop.
//
// Behavior:
// - Installs render.animate (and loop state) on the provided App surface.
// - Idempotency is structural: once render.animate exists on the canonical render seam, install is complete.

import type { AppContainer, UnknownRecord } from '../../../types';

import { installRenderAnimateViaPlatform } from '../runtime/platform_access.js';
import { installStableSurfaceSlot } from '../runtime/stable_surface_slots.js';

import { asAppLike, reportRenderLoop, toAppContainer } from './render_loop_impl_support.js';
import {
  getInstalledRender,
  hasRenderLoopInstallContract,
  isInstalledRenderAnimate,
  markInstalledRenderAnimate,
} from './render_loop_impl_contracts.js';
import { createInstalledRenderAnimate } from './render_loop_impl_runtime.js';
import {
  ensureRenderNamespace,
  ensureRenderRuntimeState,
  getLastFrameTs,
  getLoopRaf,
  getRafScheduledAt,
  setAnimateFn,
  setLastFrameTs,
  setLoopRaf,
  setRafScheduledAt,
} from '../runtime/render_access.js';

const RENDER_LOOP_CANONICAL_ANIMATE_KEY = '__wpCanonicalRenderAnimate';

type RenderAnimateFn = (time?: number) => void;
type RenderInstallHost = UnknownRecord & AppContainer['render'];

function ensureRenderInstallHost(App: unknown): RenderInstallHost {
  return ensureRenderNamespace(App);
}

export function installRenderLoopImpl(App: unknown): AppContainer['render'] {
  const root = asAppLike(App);
  const render = ensureRenderInstallHost(root);
  ensureRenderRuntimeState(root);

  // Keep the local App alias short because it is threaded through every render-loop callback.
  const A = root;
  const report = (op: string, err: unknown, opts?: { throttleMs?: number; failFast?: boolean }) => {
    reportRenderLoop(A, op, err, opts);
  };

  const alreadyInstalled = hasRenderLoopInstallContract(root);
  const canonicalAnimate = installStableSurfaceSlot<RenderAnimateFn>(
    render,
    'animate',
    RENDER_LOOP_CANONICAL_ANIMATE_KEY,
    isInstalledRenderAnimate,
    () => markInstalledRenderAnimate(createInstalledRenderAnimate(A, report))
  );

  // Idempotent by canonical contract ownership: if the full contract already existed before this
  // call, avoid re-registering animate() through the platform seam.
  if (alreadyInstalled && render.animate === canonicalAnimate && hasRenderLoopInstallContract(root)) {
    return getInstalledRender(root);
  }

  const installedAnimate = canonicalAnimate;

  // Seed canonical loop timing slots before registering animate(). This keeps install idempotency
  // contract-based without falling back to a private boolean install marker.
  setLoopRaf(A, getLoopRaf(A));
  setLastFrameTs(A, getLastFrameTs(A));
  setRafScheduledAt(A, getRafScheduledAt(A));

  // Register the real animate() and (re)start the loop through the canonical platform seam when available.
  if (!installRenderAnimateViaPlatform(toAppContainer(A), installedAnimate)) {
    setAnimateFn(A, installedAnimate);
  }

  return getInstalledRender(root);
}
