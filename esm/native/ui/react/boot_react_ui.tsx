import { StrictMode } from 'react';
import type { ReactNode } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import type { AppContainer } from '../../../../types';
import { createExportActions } from './export_actions.js';
import { AppProvider } from './hooks.js';
import { AppErrorBoundary } from './components/index.js';
import { installStyledTooltipViewportHost } from './components/TooltipPlacement.js';
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
};

type BrowserDocProviderLike = { getDocument?: () => Document | null };

const mountedRoots = new WeakMap<Element, Root>();

const REACT_SIDEBAR_ROOT_ID = 'reactSidebarRoot';
const REACT_OVERLAY_ROOT_ID = 'reactOverlayRoot';

type ReactMountHosts = {
  sidebar: HTMLElement;
  overlay: HTMLElement;
};

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

function createConsoleToast(): (msg: string, type?: string) => void {
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

function requireReactMountRoot(app: AppContainer, doc: Document, id: string): HTMLElement {
  const el = getReactMountRootMaybe(app, id);
  if (!el) {
    throw new Error(`[WardrobePro][React] Required mount root #${id} is missing.`);
  }
  if (el.ownerDocument && el.ownerDocument !== doc) {
    throw new Error(`[WardrobePro][React] Mount root #${id} belongs to a different document.`);
  }
  return el;
}

function requireDirectMountOwner(app: AppContainer, root: HTMLElement, ownerId: string): HTMLElement {
  const owner = getReactMountRootMaybe(app, ownerId);
  if (!owner || root.parentElement !== owner) {
    throw new Error(`[WardrobePro][React] Mount root #${root.id} must be a direct child of #${ownerId}.`);
  }
  return owner;
}

function assertFreshMountRoot(root: HTMLElement): void {
  if (mountedRoots.has(root)) return;
  if (root.hasChildNodes()) {
    throw new Error(
      `[WardrobePro][React] Mount root #${root.id} must be empty; non-React/pre-rendered DOM is unsupported.`
    );
  }
}

function requireReactMountHosts(app: AppContainer, doc: Document): ReactMountHosts {
  const sidebar = requireReactMountRoot(app, doc, REACT_SIDEBAR_ROOT_ID);
  const overlay = requireReactMountRoot(app, doc, REACT_OVERLAY_ROOT_ID);
  const sidebarOwner = requireDirectMountOwner(app, sidebar, 'sidebar');
  requireDirectMountOwner(app, overlay, 'viewer-container');

  if (sidebarOwner.childElementCount !== 1 || sidebarOwner.firstElementChild !== sidebar) {
    throw new Error('[WardrobePro][React] #sidebar must be owned exclusively by #reactSidebarRoot.');
  }

  assertFreshMountRoot(sidebar);
  assertFreshMountRoot(overlay);
  return { sidebar, overlay };
}

export function bootReactUi(opts: BootReactUiOpts): void {
  // Do not touch browser globals here (eslint no-restricted-globals).
  // Prefer an injected Document (entry), but fall back to the browser env adapter.
  const doc = opts.document ?? getDocumentFromApp(opts.app);
  if (!doc) {
    throw new Error('[WardrobePro][React] Browser document is required to mount the React UI.');
  }

  const app = opts.app;
  // Validate the complete shell before installing interactions or creating either root.
  // This prevents a partial boot from silently taking over stale/non-React DOM.
  const mountHosts = requireReactMountHosts(app, doc);

  // UI feedback surface (stable; never throws). Used by actions and interactions.
  const fb = getUiFeedback(app);
  const toast =
    typeof fb?.toast === 'function'
      ? (msg: string, type?: string) => fb.toast?.(msg, type)
      : createConsoleToast();

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
  // React-only runtime interactions
  // ---------------------------------------------------------------------------
  // Keep them at the React shell boundary so the app stays one system without hybrid DOM layers.
  const uiRt = getUiRuntime(app);

  // Lightweight accessibility helpers (Enter/Space activation for row controls).
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

  // Styled React tooltips live in a fixed viewport host so long labels never expand
  // scrollable panels such as the saved-models list.
  try {
    uiRt.install('ui:styledTooltipViewportHost', () => installStyledTooltipViewportHost(doc));
  } catch (e) {
    __reportBoot('installStyledTooltipViewportHost', e);
  }

  const mount = (el: HTMLElement, id: string, label: string, node: ReactNode): void => {
    // Idempotent mount
    if (mountedRoots.has(el)) return;

    const perfSpanId = startPerfSpan(app, `boot.react.mount.${id}`);
    const root = createRoot(el, { identifierPrefix: `${id}-` });
    try {
      root.render(
        <StrictMode>
          <AppProvider app={app}>
            <AppErrorBoundary app={app} label={label}>
              {node}
            </AppErrorBoundary>
          </AppProvider>
        </StrictMode>
      );
      mountedRoots.set(el, root);
    } catch (error) {
      try {
        root.unmount();
      } catch {
        // Preserve the original mount failure.
      }
      throw error;
    }

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

  mount(mountHosts.sidebar, REACT_SIDEBAR_ROOT_ID, 'Sidebar', <ReactSidebarApp />);
  mount(mountHosts.overlay, REACT_OVERLAY_ROOT_ID, 'Overlay', <ReactOverlayApp />);

  // Global React overlay styles are enabled only after the complete shell mounted.
  doc.body.classList.add('wp-ui-react');
}
