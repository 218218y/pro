// UI interactions: viewer resize handling (Pure ESM)
//
// Goal:
// - Keep resize logic out of ui/wiring.
// - Use ResizeObserver when available; fall back to window resize.
// - Schedule work via rAF to avoid resize storms.

import type { AppContainer } from '../../../../types';
import {
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

export function installViewerResize(App: AppContainer, deps: ViewerResizeDeps): () => void {
  const container = deps?.container;
  const win = deps?.win ?? null;
  const triggerRender = deps?.triggerRender;

  if (!App || typeof App !== 'object') return () => undefined;
  if (!container || typeof container !== 'object') return () => undefined;

  let disposed = false;
  let pending = false;

  const apply = () => {
    try {
      const render = readRender(App);
      const camera = render?.camera ?? null;
      const renderer = render?.renderer ?? null;
      if (!camera || !renderer) return;

      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);

      camera.aspect = w / h;
      if (typeof camera.updateProjectionMatrix === 'function') camera.updateProjectionMatrix();
      if (typeof renderer.setSize === 'function') renderer.setSize(w, h);

      const cornerControls = render?.cornerControls ?? null;
      if (cornerControls && typeof cornerControls.handleResize === 'function') cornerControls.handleResize();

      const controls = render?.controls ?? null;
      if (controls && typeof controls.handleResize === 'function') controls.handleResize();

      if (typeof triggerRender === 'function') triggerRender(false);
    } catch {
      // swallow
    }
  };

  const raf = (cb: FrameRequestCallback) => {
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

  const schedule = () => {
    try {
      if (disposed || pending) return;
      pending = true;
      raf(() => {
        pending = false;
        apply();
      });
    } catch {
      // swallow
    }
  };

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    try {
      ro = new ResizeObserver(() => schedule());
      ro.observe(container);
      ensureRender(App)._resizeObserver = ro;
    } catch {
      ro = null;
    }
  }

  let cleanupWin: (() => void) | null = null;
  if (!ro && win) {
    try {
      win.addEventListener('resize', schedule, { passive: true });
      cleanupWin = () => {
        try {
          win.removeEventListener('resize', schedule);
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
