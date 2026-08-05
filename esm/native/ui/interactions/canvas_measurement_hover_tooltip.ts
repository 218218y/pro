type ViewerMeasurementHoverFeedback = {
  kind: 'viewer-measurement';
  cursor: '__wp_canvas_hover_cursor_preserve';
  partLabel: string | null;
};

type MeasurementTooltipState = {
  root: HTMLElement;
  title: HTMLElement;
};

const tooltipByCanvas = new WeakMap<HTMLElement, MeasurementTooltipState>();
const VIEWER_MEASUREMENT_HOVER_KIND = 'viewer-measurement';
const CANVAS_HOVER_CURSOR_PRESERVE = '__wp_canvas_hover_cursor_preserve';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readPartLabel(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readViewerMeasurementHoverFeedback(value: unknown): ViewerMeasurementHoverFeedback | null {
  if (!isRecord(value)) return null;
  if (value.kind !== VIEWER_MEASUREMENT_HOVER_KIND) return null;
  if (value.cursor !== CANVAS_HOVER_CURSOR_PRESERVE) return null;
  return {
    kind: VIEWER_MEASUREMENT_HOVER_KIND,
    cursor: CANVAS_HOVER_CURSOR_PRESERVE,
    partLabel: readPartLabel(value.partLabel),
  };
}

export function shouldPreserveCanvasHoverCursor(value: unknown): boolean {
  return value === CANVAS_HOVER_CURSOR_PRESERVE || readViewerMeasurementHoverFeedback(value) != null;
}

function ensureMeasurementTooltip(domEl: HTMLElement): MeasurementTooltipState | null {
  const existing = tooltipByCanvas.get(domEl);
  if (existing) return existing;

  const doc = domEl.ownerDocument;
  if (!doc?.body || typeof doc.createElement !== 'function') return null;

  const root = doc.createElement('div');
  root.className = 'wp-r-floating-tooltip wp-viewer-measurement-part-tooltip is-rich is-above';
  root.setAttribute('role', 'tooltip');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('data-wp-viewer-measurement-part-tooltip', 'true');
  root.dir = 'rtl';
  root.style.zIndex = 'var(--wp-z-tooltip)';

  const title = doc.createElement('strong');
  title.className = 'wp-r-floating-tooltip-title';
  root.appendChild(title);

  const detail = doc.createElement('small');
  detail.className = 'wp-r-floating-tooltip-detail';
  detail.textContent = 'לחיצה להצגת מידות החלק';
  root.appendChild(detail);

  doc.body.appendChild(root);
  const state = { root, title };
  tooltipByCanvas.set(domEl, state);
  return state;
}

function readViewportWidth(domEl: HTMLElement): number {
  const doc = domEl.ownerDocument;
  const windowWidth = doc?.defaultView?.innerWidth;
  if (typeof windowWidth === 'number' && Number.isFinite(windowWidth) && windowWidth > 0) {
    return windowWidth;
  }
  const documentWidth = doc?.documentElement?.clientWidth;
  if (typeof documentWidth === 'number' && Number.isFinite(documentWidth) && documentWidth > 0) {
    return documentWidth;
  }
  const rect = domEl.getBoundingClientRect();
  return Math.max(320, rect.left + rect.width);
}

function clampTooltipCenterX(domEl: HTMLElement, clientX: number): number {
  const viewportWidth = readViewportWidth(domEl);
  const maxHalfWidth = Math.min(132, Math.max(0, viewportWidth / 2 - 10));
  const minX = 10 + maxHalfWidth;
  const maxX = viewportWidth - 10 - maxHalfWidth;
  if (maxX < minX) return viewportWidth / 2;
  return Math.min(maxX, Math.max(minX, clientX));
}

export function hideViewerMeasurementHoverTooltip(domEl: HTMLElement): void {
  const state = tooltipByCanvas.get(domEl);
  if (!state) return;
  state.root.classList.remove('is-open');
  state.root.setAttribute('aria-hidden', 'true');
}

export function syncViewerMeasurementHoverTooltip(
  domEl: HTMLElement,
  hoverResult: unknown,
  clientX: number,
  clientY: number
): void {
  const feedback = readViewerMeasurementHoverFeedback(hoverResult);
  if (!feedback?.partLabel || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    hideViewerMeasurementHoverTooltip(domEl);
    return;
  }

  const state = ensureMeasurementTooltip(domEl);
  if (!state) return;

  state.title.textContent = feedback.partLabel;
  state.root.setAttribute('data-part-label', feedback.partLabel);
  state.root.style.left = `${Math.round(clampTooltipCenterX(domEl, clientX))}px`;
  state.root.style.top = `${Math.round(clientY)}px`;

  const placeBelow = clientY < 96;
  state.root.classList.toggle('is-above', !placeBelow);
  state.root.classList.toggle('is-below', placeBelow);
  state.root.classList.add('is-open');
  state.root.setAttribute('aria-hidden', 'false');
}

export function disposeViewerMeasurementHoverTooltip(domEl: HTMLElement): void {
  const state = tooltipByCanvas.get(domEl);
  if (!state) return;
  tooltipByCanvas.delete(domEl);
  state.root.remove();
}
