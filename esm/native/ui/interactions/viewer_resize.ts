// UI interactions: viewer resize handling (Pure ESM)
//
// Goal:
// - Keep resize logic out of ui/wiring.
// - Use ResizeObserver when available; fall back to window resize.
// - Schedule work via rAF to avoid resize storms.

import type { AppContainer } from '../../../../types';
import {
  cancelAnimationFrameMaybe,
  requestAnimationFrameMaybe,
  getBrowserTimers,
  ensureRenderNamespace,
  getRenderNamespace,
} from '../../services/api.js';

type CameraWithAspect = {
  aspect?: number;
  updateProjectionMatrix?: () => void;
};

type RendererWithSize = {
  setSize?: (width: number, height: number) => void;
};

type ResizeAwareControl = {
  handleResize?: () => void;
};

type RenderResizeState = {
  camera?: CameraWithAspect | null;
  renderer?: RendererWithSize | null;
  cornerControls?: ResizeAwareControl | null;
  controls?: ResizeAwareControl | null;
  _resizeObserver?: ResizeObserver | null;
};

type ViewerSize = {
  width: number;
  height: number;
};

function isRenderResizeState(value: unknown): value is RenderResizeState {
  return !!value && typeof value === 'object';
}

export type ViewerResizeDeps = {
  container: HTMLElement;
  win: Window | null;
  triggerRender: (updateShadows?: boolean) => void;
};

function readRender(App: AppContainer): RenderResizeState | null {
  const render = getRenderNamespace(App);
  return isRenderResizeState(render) ? render : null;
}

function ensureRender(App: AppContainer): RenderResizeState {
  const render = ensureRenderNamespace(App);
  return isRenderResizeState(render) ? render : {};
}

function normalizeViewerSize(width: number, height: number): ViewerSize | null {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { width: w, height: h };
}

function readContainerSize(container: HTMLElement): ViewerSize | null {
  return normalizeViewerSize(container.clientWidth, container.clientHeight);
}

function readResizeObserverSize(
  entries: readonly ResizeObserverEntry[],
  container: HTMLElement
): ViewerSize | null {
  const entry = entries.find(item => item && item.target === container) || entries[0] || null;
  const rect = entry?.contentRect ?? null;
  return rect ? normalizeViewerSize(rect.width, rect.height) : null;
}

function isSameSize(a: ViewerSize | null, b: ViewerSize | null): boolean {
  return !!a && !!b && a.width === b.width && a.height === b.height;
}

function isViewerSize(value: unknown): value is ViewerSize {
  return (
    !!value &&
    typeof value === 'object' &&
    Number.isFinite((value as ViewerSize).width) &&
    Number.isFinite((value as ViewerSize).height)
  );
}

export function installViewerResize(App: AppContainer, deps: ViewerResizeDeps): () => void {
  const container = deps?.container;
  const win = deps?.win ?? null;
  const triggerRender = deps?.triggerRender;

  if (!App || typeof App !== 'object') return () => undefined;
  if (!container || typeof container !== 'object') return () => undefined;

  let disposed = false;
  let pending = false;
  let rafId: number | null = null;
  let lastAppliedSize: ViewerSize | null = null;
  let queuedSize: ViewerSize | null = null;

  const apply = (sizeHint?: ViewerSize | null) => {
    try {
      if (disposed) return;
      const render = readRender(App);
      const camera = render?.camera ?? null;
      const renderer = render?.renderer ?? null;
      if (!camera || !renderer) return;

      const size = isViewerSize(sizeHint) ? sizeHint : readContainerSize(container);
      if (!size || isSameSize(size, lastAppliedSize)) return;
      lastAppliedSize = size;

      camera.aspect = size.width / size.height;
      if (typeof camera.updateProjectionMatrix === 'function') camera.updateProjectionMatrix();
      if (typeof renderer.setSize === 'function') renderer.setSize(size.width, size.height);

      const cornerControls = render?.cornerControls ?? null;
      if (cornerControls && typeof cornerControls.handleResize === 'function') cornerControls.handleResize();

      const controls = render?.controls ?? null;
      if (controls && typeof controls.handleResize === 'function') controls.handleResize();

      if (typeof triggerRender === 'function') triggerRender(false);
    } catch {
      // swallow
    }
  };

  const raf = (cb: FrameRequestCallback): number | null => {
    try {
      const rafFn = requestAnimationFrameMaybe(App);
      if (rafFn) {
        const id = rafFn(cb);
        if (typeof id === 'number') return id;
      }
    } catch {
      // swallow
    }
    try {
      if (win && typeof win.requestAnimationFrame === 'function') return win.requestAnimationFrame(cb);
    } catch {
      // swallow
    }
    return getBrowserTimers(App).requestAnimationFrame(cb);
  };

  const cancelQueuedFrame = () => {
    if (rafId == null) return;
    const id = rafId;
    rafId = null;
    pending = false;
    queuedSize = null;
    try {
      const cafFn = cancelAnimationFrameMaybe(App);
      if (cafFn) {
        cafFn(id);
        return;
      }
    } catch {
      // swallow
    }
    try {
      if (win && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(id);
        return;
      }
    } catch {
      // swallow
    }
    try {
      getBrowserTimers(App).cancelAnimationFrame(id);
    } catch {
      // swallow
    }
  };

  const schedule = (sizeHint?: ViewerSize | null) => {
    try {
      if (disposed) return;
      const size = isViewerSize(sizeHint) ? sizeHint : readContainerSize(container);
      if (!size || isSameSize(size, lastAppliedSize)) return;
      queuedSize = size;
      if (pending) return;
      pending = true;
      rafId = raf(() => {
        const sizeToApply = queuedSize;
        queuedSize = null;
        rafId = null;
        pending = false;
        apply(sizeToApply);
      });
      if (rafId == null) {
        pending = false;
        apply(queuedSize);
        queuedSize = null;
      }
    } catch {
      // swallow
    }
  };

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    try {
      ro = new ResizeObserver(entries => schedule(readResizeObserverSize(entries, container)));
      ro.observe(container);
      ensureRender(App)._resizeObserver = ro;
    } catch {
      ro = null;
    }
  }

  let cleanupWin: (() => void) | null = null;
  if (!ro && win) {
    try {
      const scheduleFromWindowResize = () => schedule();
      win.addEventListener('resize', scheduleFromWindowResize, { passive: true });
      cleanupWin = () => {
        try {
          win.removeEventListener('resize', scheduleFromWindowResize);
        } catch {
          // swallow
        }
      };
    } catch {
      cleanupWin = null;
    }
  }

  schedule();

  return () => {
    disposed = true;
    try {
      cancelQueuedFrame();
      if (ro) {
        try {
          ro.disconnect();
        } catch {
          // swallow
        }
      }
      if (cleanupWin) cleanupWin();
    } catch {
      // swallow
    }

    try {
      const render = readRender(App);
      if (render && render._resizeObserver === ro) render._resizeObserver = null;
    } catch {
      // swallow
    }
  };
}
