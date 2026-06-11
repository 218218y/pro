import { buildBrowserDeps } from './native/runtime/runtime_globals.js';

import type { AppContainer, Deps3D } from '../types';
import type { ThreeLike } from '../types/three';

import type { BootEnv, BootFailure, BootFailureKind } from './entry_pro_main_shared.js';

type BootReporter = (win: Window | null, err: unknown, meta: { op: string; phase?: string }) => void;

type EntryProMainRuntimeOps = {
  bootEsm: (opts: { deps: Deps3D }) => Promise<AppContainer>;
  loadThreeEsm: () => Promise<ThreeLike>;
  loadRuntimeConfigModule: (
    win: Window | null
  ) => Promise<{ config: Record<string, unknown> | null; flags: Record<string, unknown> | null }>;
  applyValidatedRuntimeFlags: (
    deps: Deps3D,
    runtimeFlags: Record<string, unknown> | null,
    win: Window | null
  ) => void;
  resolveRuntimeConfig: (
    doc: Document | null,
    runtimeModule: { config: Record<string, unknown> | null; flags: Record<string, unknown> | null },
    win: Window | null
  ) => Record<string, unknown>;
  runBrowserBootSetup: (opts: {
    app: AppContainer;
    window: Window | null;
    document: Document | null;
    report: (err: unknown, meta: { op: string; phase?: string }) => void;
  }) => Promise<void>;
  classifyFailure: (err: unknown, ctx: Record<string, unknown>) => BootFailure;
  showFatalOverlayMaybe: (
    win: Window | null,
    doc: Document | null,
    err: unknown,
    opts: { failure: BootFailure; description: string; title?: string; helpKind?: BootFailureKind }
  ) => Promise<boolean>;
  reportOverlayFailurePreservingOriginal: (
    win: Window | null,
    overlayErr: unknown,
    meta: { op: string; phase?: string },
    originalErr: unknown
  ) => never;
  bootReportBestEffort: BootReporter;
};

export type ResolvedBootEnv = {
  window: Window | null;
  document: Document | null;
};

export function resolveBootEnv(env: BootEnv = {}): ResolvedBootEnv {
  return {
    window: env.window ?? (typeof window !== 'undefined' ? window : null),
    document: env.document ?? (typeof document !== 'undefined' ? document : null),
  };
}

export function createEntryBrowserDeps(env: ResolvedBootEnv, THREE: ThreeLike): Deps3D {
  return {
    THREE,
    browser: buildBrowserDeps({ window: env.window, document: env.document }),
  };
}

export async function showEntryBootOverlayFailure(
  env: ResolvedBootEnv,
  err: unknown,
  opts: {
    classifyFailure: EntryProMainRuntimeOps['classifyFailure'];
    showFatalOverlayMaybe: EntryProMainRuntimeOps['showFatalOverlayMaybe'];
    reportOverlayFailurePreservingOriginal: EntryProMainRuntimeOps['reportOverlayFailurePreservingOriginal'];
    phase: 'loadThreeEsm' | 'boot';
    description: string;
    helpKind?: BootFailureKind;
  }
): Promise<never> {
  const failure = opts.classifyFailure(err, { phase: opts.phase });
  try {
    await opts.showFatalOverlayMaybe(env.window, env.document, err, {
      failure,
      description: opts.description,
      helpKind: opts.helpKind,
    });
  } catch (overlayErr) {
    opts.reportOverlayFailurePreservingOriginal(
      env.window,
      overlayErr,
      { phase: opts.phase, op: 'showFatalOverlay' },
      err
    );
  }
  throw err;
}

export async function bootProEntryRuntime(
  env: BootEnv = {},
  ops: EntryProMainRuntimeOps
): Promise<AppContainer> {
  const resolvedEnv = resolveBootEnv(env);

  let THREE: ThreeLike;
  try {
    THREE = await ops.loadThreeEsm();
  } catch (err) {
    return showEntryBootOverlayFailure(resolvedEnv, err, {
      classifyFailure: ops.classifyFailure,
      showFatalOverlayMaybe: ops.showFatalOverlayMaybe,
      reportOverlayFailurePreservingOriginal: ops.reportOverlayFailurePreservingOriginal,
      phase: 'loadThreeEsm',
      description: 'Failed to load 3D engine (THREE).',
      helpKind: 'three',
    });
  }

  const deps = createEntryBrowserDeps(resolvedEnv, THREE);
  const runtimeModule = await ops.loadRuntimeConfigModule(resolvedEnv.window);
  ops.applyValidatedRuntimeFlags(deps, runtimeModule.flags, resolvedEnv.window);
  deps.config = ops.resolveRuntimeConfig(resolvedEnv.document, runtimeModule, resolvedEnv.window);

  try {
    const app = await ops.bootEsm({ deps });
    await ops.runBrowserBootSetup({
      app,
      window: resolvedEnv.window,
      document: resolvedEnv.document,
      report: (err, meta) => ops.bootReportBestEffort(resolvedEnv.window, err, meta),
    });
    return app;
  } catch (err) {
    return showEntryBootOverlayFailure(resolvedEnv, err, {
      classifyFailure: ops.classifyFailure,
      showFatalOverlayMaybe: ops.showFatalOverlayMaybe,
      reportOverlayFailurePreservingOriginal: ops.reportOverlayFailurePreservingOriginal,
      phase: 'boot',
      description: 'An error occurred during boot.',
    });
  }
}
