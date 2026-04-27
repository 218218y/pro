import { StrictMode } from 'react';
import type { ReactNode } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import type { AppContainer } from '../../../../types';
import { createExportActions } from './export_actions.js';
import { AppProvider } from './hooks.js';
import { AppErrorBoundary } from './components/index.js';
import { ReactOverlayApp } from './overlay_app.js';
import { ReactSidebarApp } from './sidebar_app.js';

import { getReactMountRootMaybe, getUiFeedback, reportError, shouldFailFast } from '../../services/api.js';
import { installAccessibilityShortcuts } from '../interactions/accessibility_shortcuts.js';
import { installHistoryUI } from '../interactions/history_ui.js';
import { installProjectDragDrop } from '../interactions/project_drag_drop.js';
import { ensureSaveProjectAction } from '../interactions/project_save_load.js';
import { getUiRuntime } from '../runtime/ui_runtime.js';
import { endPerfSpan, markPerfPoint, startPerfSpan } from '../../services/api.js';

type BootReactUiOpts = {
  app: AppContainer;
  document?: Document | null;
  mountId?: string;
};

type BrowserDocProviderLike = { getDocument?: () => Document | null };

const mountedRoots = new WeakMap<Element, Root>();

function isBrowserDocProviderLike(value: unknown): value is BrowserDocProviderLike {
  return !!value && typeof value === 'object';
}

function readBrowserDocProvider(app: AppContainer): BrowserDocProviderLike | null {
  try {
    const browser = Reflect.get(app, 'browser');
    return isBrowserDocProviderLike(browser) ? browser : null;
  } catch {
    return null;
  }
}

function createToastFallback(): (msg: string, type?: string) => void {
  return (msg: string, type?: string) => {
    try {
      console.log('[toast]', type || 'info', msg);
    } catch {
      // swallow
    }
  };
}

function getDocumentFromApp(app: AppContainer): Document | null {
  try {
    const fn = readBrowserDocProvider(app)?.getDocument;
    return typeof fn === 'function' ? fn() : null;
  } catch {
    return null;
  }
}

export function bootReactUi(opts: BootReactUiOpts): void {
  // Do not touch browser globals here (eslint no-restricted-globals).
  // Prefer an injected Document (entry), but fall back to the browser env adapter.
  const doc = opts.document ?? getDocumentFromApp(opts.app);
  if (!doc) return;

  const app = opts.app;

  // UI feedback surface (stable; never throws). Used by actions and interactions.
  const fb = getUiFeedback(app);
  const toast =
    typeof fb?.toast === 'function'
      ? (msg: string, type?: string) => fb.toast?.(msg, type)
      : createToastFallback();

  const __reportBoot = (op: string, err: unknown) => {
    reportError(app, err, { where: 'ui/react/boot_react_ui', op });
    if (shouldFailFast(app)) throw err;
  };

  // Ensure core project actions exist before we mount React.
  try {
    ensureSaveProjectAction(app, { win: doc.defaultView ?? null, doc, toast });
  } catch (e) {
    __reportBoot('ensureSaveProjectAction', e);
  }

  const exportActions = createExportActions(app, toast);

  // ---------------------------------------------------------------------------
  // React-only runtime interactions (no legacy ui/bootstrap bindings)
  // ---------------------------------------------------------------------------
  // These were historically installed by legacy UI wiring. We keep them here
  // (React shell boundary) so the app stays "one system" without hybrid DOM layers.
  const uiRt = getUiRuntime(app);

  // Lightweight accessibility helpers (Enter/Space activation for legacy-like rows).
  try {
    uiRt.install('ui:accessibilityShortcuts', () => installAccessibilityShortcuts(app, { doc }));
  } catch (e) {
    __reportBoot('installAccessibilityShortcuts', e);
  }

  // History keyboard shortcuts (Ctrl/Cmd+Z/Y, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+C when not typing)
  try {
    uiRt.install('ui:historyUi', () =>
      installHistoryUI(app, {
        doc,
        // React-only: call the export action directly (no DOM id dependency).
        copyToClipboard: exportActions.exportCopyToClipboard,
      })
    );
  } catch (e) {
    __reportBoot('installHistoryUI', e);
  }

  // Drag & drop a JSON project file onto the page (OS file drags only).
  try {
    uiRt.install('ui:projectDragDrop', () => installProjectDragDrop(app, { doc, toast }));
  } catch (e) {
    __reportBoot('installProjectDragDrop', e);
  }

  const mount = (id: string, node: ReactNode): void => {
    const el = getReactMountRootMaybe(app, id);
    if (!el) return;

    // Idempotent mount
    if (mountedRoots.has(el)) return;

    const perfSpanId = startPerfSpan(app, `boot.react.mount.${id}`);
    const root = createRoot(el);
    mountedRoots.set(el, root);

    const label = id === 'reactOverlayRoot' ? 'Overlay' : 'Sidebar';

    root.render(
      <StrictMode>
        <AppProvider app={app}>
          <AppErrorBoundary app={app} label={label}>
            {node}
          </AppErrorBoundary>
        </AppProvider>
      </StrictMode>
    );

    const finalizeMount = () => {
      endPerfSpan(app, perfSpanId);
      markPerfPoint(app, `boot.react.mounted.${id}`);
    };

    const win = doc.defaultView;
    if (win && typeof win.requestAnimationFrame === 'function') {
      win.requestAnimationFrame(() => finalizeMount());
      return;
    }
    queueMicrotask(finalizeMount);
  };

  const mountId = typeof opts.mountId === 'string' && opts.mountId ? opts.mountId : 'reactSidebarRoot';
  mount(mountId, <ReactSidebarApp />);

  // Viewer overlay (camera controls + undo/redo). Optional mount.
  mount('reactOverlayRoot', <ReactOverlayApp />);
}
