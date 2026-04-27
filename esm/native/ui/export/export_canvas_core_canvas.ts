// WardrobePro — Export canvas renderer/canvas helpers (Native ESM)

import { getFn, getNumberProp, getProp, isObjectLike } from './export_canvas_core_shared.js';

const RENDERER_CONTEXT_KINDS = ['webgl2', 'webgl', 'experimental-webgl', '2d'];

export type RefTargetLike = Partial<{ x: number; y: number; z: number }>;

export type DomElementSizeCandidate = {
  width?: unknown;
  height?: unknown;
  clientWidth?: unknown;
  clientHeight?: unknown;
  getBoundingClientRect?: (() => unknown) | null;
};

function _isHtmlCanvasElement(v: unknown): v is HTMLCanvasElement {
  return !!v && typeof v === 'object' && typeof getProp(v, 'getContext') === 'function';
}

function _readCanvasFromNode(value: unknown): HTMLCanvasElement | null {
  if (_isHtmlCanvasElement(value)) return value;
  if (!value || typeof value !== 'object') return null;

  const directCanvas = getProp(value, 'canvas');
  if (_isHtmlCanvasElement(directCanvas)) return directCanvas;

  const firstElementChild = getProp(value, 'firstElementChild');
  if (_isHtmlCanvasElement(firstElementChild)) return firstElementChild;

  const children = getProp(value, 'children');
  if (children && typeof getProp(children, 'length') === 'number') {
    const len = getNumberProp(children, 'length', 0);
    for (let i = 0; i < len; i += 1) {
      const child = getProp(children, String(i));
      const found = _readCanvasFromNode(child);
      if (found) return found;
    }
  }

  const qs = getProp(value, 'querySelector');
  if (typeof qs === 'function') {
    try {
      const inner = Reflect.apply(qs, value, ['canvas']);
      if (_isHtmlCanvasElement(inner)) return inner;
    } catch {
      // ignore
    }
  }

  return null;
}

export function _getRendererCanvasSource(renderer: { domElement: unknown }): HTMLCanvasElement {
  const direct = _readCanvasFromNode(renderer.domElement);
  if (direct) return direct;

  const contextGetter = getFn<(...args: readonly unknown[]) => unknown>(renderer, 'getContext');
  if (contextGetter) {
    for (const kind of RENDERER_CONTEXT_KINDS) {
      try {
        const ctx = contextGetter.call(renderer, kind);
        const canvas = _readCanvasFromNode(getProp(ctx, 'canvas'));
        if (canvas) return canvas;
      } catch {
        // ignore
      }
    }
  }

  throw new Error('[WardrobePro][ESM] renderer.domElement is not a drawable canvas');
}

function readDomElementSizeCandidate(el: unknown): DomElementSizeCandidate | null {
  if (!isObjectLike(el)) return null;
  const getBoundingClientRect = getFn<() => unknown>(el, 'getBoundingClientRect');
  return {
    width: getProp(el, 'width'),
    height: getProp(el, 'height'),
    clientWidth: getProp(el, 'clientWidth'),
    clientHeight: getProp(el, 'clientHeight'),
    getBoundingClientRect,
  };
}

function readPositiveSize(width: unknown, height: unknown): { width: number; height: number } | null {
  return typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0
    ? { width, height }
    : null;
}

function _getDomElementSize(el: unknown): { width: number; height: number } {
  const fallback = { width: 1, height: 1 };
  const sizeEl = readDomElementSizeCandidate(el);
  if (!sizeEl) return fallback;

  const rawSize = readPositiveSize(sizeEl.width, sizeEl.height);
  if (rawSize) return rawSize;

  const clientSize = readPositiveSize(sizeEl.clientWidth, sizeEl.clientHeight);
  if (clientSize) return clientSize;

  if (typeof sizeEl.getBoundingClientRect === 'function') {
    try {
      const rect = sizeEl.getBoundingClientRect();
      const bounds = isObjectLike(rect)
        ? { width: getProp(rect, 'width'), height: getProp(rect, 'height') }
        : null;
      const rectSize = bounds ? readPositiveSize(bounds.width, bounds.height) : null;
      if (rectSize) return rectSize;
    } catch {
      // ignore
    }
  }

  return fallback;
}

export function _getRendererSize(renderer: { domElement: unknown }): { width: number; height: number } {
  return _getDomElementSize(renderer.domElement);
}
