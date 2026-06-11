// WardrobePro Pure ESM entry (TypeScript implementation).
//
// Goals:
// - No global App (no window/global-scope).
// - No install-on-import side effects.
// - Explicit dependency injection (app.deps).
// - Explicit boot that returns the app object (Promise).

import { createAppContainer } from './app_container.js';
import { bootSequence } from './boot/boot_sequence.js';
import { installAppDeps, requireThreeDeps } from './boot/boot_app_shared.js';

import type { AppContainer, Deps } from '../types';

const __createAppSoftWarnSeen = new Map<string, number>();

function __createAppSoftWarn(op: string, err: unknown): void {
  try {
    const now = Date.now();
    const key = String(op || 'unknown');
    const prev = __createAppSoftWarnSeen.get(key) || 0;
    if (prev && now - prev < 2000) return;
    __createAppSoftWarnSeen.set(key, now);
    console.warn(`[WardrobePro][esm/main] ${key}`, err);
  } catch {
    // ignore console/clock failures while reporting createApp soft errors
  }
}

export function createApp(opts: { deps?: Deps } = {}): AppContainer {
  const deps = opts.deps;
  const app: AppContainer = createAppContainer();

  if (deps) installAppDeps(app, deps, __createAppSoftWarn);

  return app;
}

export async function boot(opts: { deps?: Deps } = {}): Promise<AppContainer> {
  const deps = opts.deps;

  requireThreeDeps(deps);

  const app = createApp({ deps });

  const runBootSequence = typeof bootSequence === 'function' ? bootSequence : null;
  if (!runBootSequence) {
    throw new Error('[WardrobePro][ESM] boot_sequence.js missing export: bootSequence(app)');
  }

  await runBootSequence(app);

  return app;
}
