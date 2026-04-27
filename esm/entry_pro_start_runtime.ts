import type { ErrorOverlayModule, EntryProMainModule, WindowWithEarlyHandlers } from './entry_pro_shared.js';

import { hasAnyOverlay, showBootFatalOverlayFallback } from './entry_pro_overlay.js';
import { reportEntryBestEffort, shouldFailFastBoot } from './entry_pro_shared.js';

type EntryProStartReporter = typeof reportEntryBestEffort;
type OverlayPresenceFn = (win: Window | null | undefined) => boolean;
type FatalOverlayFallbackFn = typeof showBootFatalOverlayFallback;
type ErrorOverlayLoader = () => Promise<ErrorOverlayModule>;
type EntryMainLoader = () => Promise<EntryProMainModule>;

type EntryProStartRuntimeOps = {
  reportBestEffort: EntryProStartReporter;
  shouldFailFastBoot: typeof shouldFailFastBoot;
  hasAnyOverlay: OverlayPresenceFn;
  showBootFatalOverlayFallback: FatalOverlayFallbackFn;
  loadErrorOverlayModule: ErrorOverlayLoader;
  loadEntryProMainModule: EntryMainLoader;
};

type RuntimeHandlerContext = {
  window: WindowWithEarlyHandlers;
  document: Document;
  ops: EntryProStartRuntimeOps;
};

const defaultStartRuntimeOps: EntryProStartRuntimeOps = {
  reportBestEffort: reportEntryBestEffort,
  shouldFailFastBoot,
  hasAnyOverlay: (win: Window | null | undefined) => !!win && hasAnyOverlay(win),
  showBootFatalOverlayFallback,
  loadErrorOverlayModule: () => import('./native/ui/error_overlay.js'),
  loadEntryProMainModule: () => import('./entry_pro_main.js'),
};

export function getEntryProStartRuntimeOps(
  overrides: Partial<EntryProStartRuntimeOps> | null | undefined = null
): EntryProStartRuntimeOps {
  return {
    ...defaultStartRuntimeOps,
    ...(overrides || {}),
  };
}

export async function showRuntimeFatalOverlay(
  ctx: RuntimeHandlerContext,
  err: unknown,
  opts: { title: string; description: string; context?: unknown; helpHtml?: string }
): Promise<void> {
  const { window: win, document: doc, ops } = ctx;

  if (ops.hasAnyOverlay(win)) return;

  try {
    const mod = await ops.loadErrorOverlayModule();
    const show = mod.showFatalOverlay;
    if (typeof show === 'function') {
      show({
        window: win,
        document: doc,
        title: opts.title,
        description: opts.description,
        error: err,
        context: opts.context,
        helpHtml: opts.helpHtml,
      });
      return;
    }
  } catch (overlayErr) {
    ops.reportBestEffort(overlayErr, { area: 'entry_pro', op: 'runtime.showFatalOverlay' }, { win });
  }

  ops.showBootFatalOverlayFallback({
    window: win,
    document: doc,
    title: opts.title,
    description: opts.description,
    error: err,
    context: opts.context,
    helpHtml: opts.helpHtml,
  });
}

export function createEarlyErrorHandler(ctx: RuntimeHandlerContext): (err: unknown) => Promise<void> {
  return async (err: unknown) => {
    try {
      await showRuntimeFatalOverlay(ctx, err, {
        title: 'WardrobePro runtime error',
        description: 'An unhandled error occurred.',
      });
    } catch (handlerErr) {
      ctx.ops.reportBestEffort(
        handlerErr,
        { area: 'entry_pro', op: 'earlyHandler.handler' },
        { win: ctx.window }
      );
    }
  };
}

export function installEntryProEarlyHandlers(
  win: WindowWithEarlyHandlers,
  doc: Document,
  overrides: Partial<EntryProStartRuntimeOps> | null | undefined = null
): void {
  const ops = getEntryProStartRuntimeOps(overrides);

  try {
    if (win.__wpEarlyHandlersInstalled) return;
    win.__wpEarlyHandlersInstalled = true;

    const handler = createEarlyErrorHandler({ window: win, document: doc, ops });

    win.addEventListener('error', (ev: ErrorEvent) => {
      void handler(ev && ev.error ? ev.error : ev);
    });
    win.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      void handler(ev.reason);
    });
  } catch (err) {
    ops.reportBestEffort(err, { area: 'entry_pro', op: 'installEarlyHandlers' }, { win });
  }
}

export async function startEntryProRuntime(
  win: Window | null,
  doc: Document | null,
  overrides: Partial<EntryProStartRuntimeOps> | null | undefined = null
): Promise<void> {
  const ops = getEntryProStartRuntimeOps(overrides);
  const earlyWindow: WindowWithEarlyHandlers | null = win;

  if (earlyWindow && doc) installEntryProEarlyHandlers(earlyWindow, doc, ops);

  try {
    const mod = await ops.loadEntryProMainModule();
    const boot = mod.bootProEntry;
    if (typeof boot !== 'function') {
      throw new Error('[WardrobePro][Pro] Missing bootProEntry export from entry_pro_main.');
    }
    await boot({ window: win, document: doc });
  } catch (err) {
    try {
      if (earlyWindow && doc) {
        await showRuntimeFatalOverlay({ window: earlyWindow, document: doc, ops }, err, {
          title: 'WardrobePro boot failed',
          description: 'An error occurred while starting WardrobePro.',
          context: { phase: 'entry_pro.startEntryPro' },
          helpHtml:
            '<p>Check the devtools console for the first thrown error. ' +
            'If this keeps happening, run <code>npm run verify:tsx</code> to validate the ESM import graph under Node.</p>',
        });
      } else {
        console.error('[WardrobePro][Pro] boot failed:', err);
      }
    } catch (fallbackErr) {
      ops.reportBestEffort(fallbackErr, { area: 'entry_pro', op: 'start.fallbackOverlay' }, { win });
      console.error('[WardrobePro][Pro] boot failed:', err);
    }
  }
}

export function autoStartEntryProRuntime(
  overrides: Partial<EntryProStartRuntimeOps> | null | undefined = null
): void {
  const ops = getEntryProStartRuntimeOps(overrides);

  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (ops.shouldFailFastBoot(window)) {
      void startEntryProRuntime(window, document, ops);
      return;
    }
    void startEntryProRuntime(window, document, ops);
  } catch (err) {
    const win = typeof window !== 'undefined' ? window : null;
    ops.reportBestEffort(err, { area: 'entry_pro', op: 'autoStart' }, { win });
  }
}
