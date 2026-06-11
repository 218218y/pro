import type { AppContainer } from '../../types';

type BrowserBootReporter = (err: unknown, meta: { op: string; phase?: string }) => void;
type BrowserBootSurfaceInstaller = (app: AppContainer, win: Window) => void;
type BrowserBootUiMount = (app: AppContainer, win: Window, doc: Document) => unknown;

type BrowserBootRuntimeOpts = {
  app: AppContainer;
  window: Window | null;
  document: Document | null;
  report?: BrowserBootReporter;
  mountReactUi?: BrowserBootUiMount | null;
  startBootUi?: boolean;
  installBeforeUnloadGuard?: boolean;
  installDebugSurface?: BrowserBootSurfaceInstaller | null;
  beforeUnloadMessage?: string;
  addReactBodyClass?: boolean;
  flushServices?: unknown[];
  getState?: () => unknown;
  hasDirtyState?: (state: unknown) => boolean;
};

type WindowWithBootFlag = Window & { __WP_BEFOREUNLOAD_GUARD__?: boolean };

type NoArgCallback = () => unknown;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getNoArgMethod(value: unknown, name: string): NoArgCallback | null {
  if (!isRecord(value)) return null;
  const fn = value[name];
  if (typeof fn !== 'function') return null;
  return () => Reflect.apply(fn, value, []);
}

function reportBrowserBoot(
  report: BrowserBootReporter | undefined,
  err: unknown,
  meta: { op: string; phase?: string }
): void {
  if (!report) return;
  report(err, meta);
}

export function addBodyClassMaybe(doc: Document | null, className: string): boolean {
  try {
    if (!doc?.body?.classList) return false;
    doc.body.classList.add(className);
    return true;
  } catch {
    return false;
  }
}

export function startBootUiMaybe(app: AppContainer): boolean {
  try {
    const bootNs = app.boot;
    if (!bootNs || typeof bootNs.start !== 'function') return false;
    bootNs.start();
    return true;
  } catch {
    return false;
  }
}

export function flushServicesMaybe(services: unknown[] | null | undefined): void {
  if (!services || !Array.isArray(services)) return;
  for (let i = 0; i < services.length; i++) {
    try {
      const flush = getNoArgMethod(services[i], 'flush');
      if (flush) flush();
    } catch {
      // swallow service flush failures during unload
    }
  }
}

export function hasDirtyMetaState(state: unknown): boolean {
  if (!isRecord(state)) return false;
  const meta = state.meta;
  return isRecord(meta) && meta.dirty === true;
}

export function installBeforeUnloadGuardMaybe(opts: {
  app: AppContainer;
  window: Window | null;
  report?: BrowserBootReporter;
  beforeUnloadMessage?: string;
  flushServices?: unknown[];
  getState?: () => unknown;
  hasDirtyState?: (state: unknown) => boolean;
}): boolean {
  const { app, window: win, report, beforeUnloadMessage, flushServices, getState, hasDirtyState } = opts;
  if (!win) return false;

  try {
    const bootWindow = win as WindowWithBootFlag;
    if (bootWindow.__WP_BEFOREUNLOAD_GUARD__) return true;
    bootWindow.__WP_BEFOREUNLOAD_GUARD__ = true;

    const readState =
      typeof getState === 'function'
        ? getState
        : () => (app.store && typeof app.store.getState === 'function' ? app.store.getState() : null);
    const isDirty = typeof hasDirtyState === 'function' ? hasDirtyState : hasDirtyMetaState;
    const message =
      typeof beforeUnloadMessage === 'string' && beforeUnloadMessage.trim()
        ? beforeUnloadMessage
        : 'יש שינויים שלא נשמרו. לצאת בכל זאת?';

    win.addEventListener(
      'beforeunload',
      (e: BeforeUnloadEvent) => {
        try {
          flushServicesMaybe(flushServices ?? [app.autosave, app.historySvc]);

          let dirty = false;
          try {
            dirty = !!isDirty(readState());
          } catch {
            dirty = false;
          }
          if (!dirty) return;

          e.preventDefault();
          e.returnValue = message;
          return message;
        } catch {
          return undefined;
        }
      },
      { capture: true }
    );

    return true;
  } catch (err) {
    reportBrowserBoot(report, err, { phase: 'boot', op: 'beforeunload.guard' });
    return false;
  }
}

export async function runBrowserBootRuntime(opts: BrowserBootRuntimeOpts): Promise<void> {
  const {
    app,
    window: win,
    document: doc,
    report,
    mountReactUi,
    startBootUi = false,
    installBeforeUnloadGuard = false,
    installDebugSurface,
    beforeUnloadMessage,
    addReactBodyClass = false,
    flushServices,
    getState,
    hasDirtyState,
  } = opts;

  if (!win || !doc) return;

  if (addReactBodyClass) {
    try {
      addBodyClassMaybe(doc, 'wp-ui-react');
    } catch (err) {
      reportBrowserBoot(report, err, { phase: 'reactUi', op: 'markBodyClass' });
    }
  }

  if (typeof mountReactUi === 'function') {
    try {
      await mountReactUi(app, win, doc);
    } catch (err) {
      reportBrowserBoot(report, err, { phase: 'reactUi', op: 'mount' });
    }
  }

  if (startBootUi) {
    try {
      startBootUiMaybe(app);
    } catch (err) {
      reportBrowserBoot(report, err, { phase: 'boot', op: 'boot.start' });
    }
  }

  if (typeof installDebugSurface === 'function') {
    try {
      installDebugSurface(app, win);
    } catch (err) {
      reportBrowserBoot(report, err, { phase: 'boot', op: 'debugConsole.install' });
    }
  }

  if (installBeforeUnloadGuard) {
    installBeforeUnloadGuardMaybe({
      app,
      window: win,
      report,
      beforeUnloadMessage,
      flushServices,
      getState,
      hasDirtyState,
    });
  }
}
