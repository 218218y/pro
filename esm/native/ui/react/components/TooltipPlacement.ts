const TOOLTIP_VIEWPORT_GUTTER_PX = 8;
const TOOLTIP_MAX_WIDTH_PX = 320;
const TOOLTIP_SHIFT_VAR = '--wp-r-tooltip-shift-x';
const TOOLTIP_SHIFT_ZERO = '0px';

let tooltipMeasureEl: HTMLElement | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readViewportWidth(doc: Document, win: Window): number {
  return Math.max(0, doc.documentElement.clientWidth || win.innerWidth || 0);
}

function getTooltipMeasureEl(doc: Document): HTMLElement {
  if (tooltipMeasureEl && tooltipMeasureEl.ownerDocument === doc) return tooltipMeasureEl;

  const el = doc.createElement('span');
  el.setAttribute('data-wp-r-tooltip-measure', 'true');
  el.style.position = 'fixed';
  el.style.left = '0';
  el.style.top = '-9999px';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '-1';
  el.style.boxSizing = 'border-box';
  el.style.display = 'inline-block';
  el.style.width = 'max-content';
  el.style.maxWidth = `${TOOLTIP_MAX_WIDTH_PX}px`;
  el.style.whiteSpace = 'normal';
  el.style.overflowWrap = 'break-word';
  el.style.direction = 'rtl';
  el.style.textAlign = 'center';
  el.style.fontFamily = 'Heebo, sans-serif';
  el.style.fontSize = '0.75rem';
  el.style.fontWeight = '700';
  el.style.lineHeight = '1.2';
  el.style.padding = '6px 12px';
  doc.body.appendChild(el);
  tooltipMeasureEl = el;
  return el;
}

function measureTooltipWidth(doc: Document, viewportWidth: number, text: string): number {
  const availableWidth = Math.max(0, viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX * 2);
  const maxWidth = Math.min(TOOLTIP_MAX_WIDTH_PX, availableWidth);
  const el = getTooltipMeasureEl(doc);
  el.style.maxWidth = `${maxWidth}px`;
  el.textContent = text;
  return Math.min(Math.ceil(el.getBoundingClientRect().width), maxWidth);
}

export function resetStyledTooltipViewportClamp(el: HTMLElement | null | undefined): void {
  if (!el) return;
  el.style.setProperty(TOOLTIP_SHIFT_VAR, TOOLTIP_SHIFT_ZERO);
}

export function clampStyledTooltipToViewport(
  el: HTMLElement | null | undefined,
  tooltip: string | undefined
): void {
  if (!el || !tooltip) {
    resetStyledTooltipViewportClamp(el);
    return;
  }

  const doc = el.ownerDocument;
  const win = doc.defaultView;
  if (!win || !doc.body) return;

  const viewportWidth = readViewportWidth(doc, win);
  if (!viewportWidth) return;

  const tooltipWidth = measureTooltipWidth(doc, viewportWidth, tooltip);
  if (!tooltipWidth) return;

  const rect = el.getBoundingClientRect();
  const desiredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
  const maxLeft = Math.max(
    TOOLTIP_VIEWPORT_GUTTER_PX,
    viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX - tooltipWidth
  );
  const clampedLeft = clamp(desiredLeft, TOOLTIP_VIEWPORT_GUTTER_PX, maxLeft);
  const shift = Math.round(clampedLeft - desiredLeft);

  if (shift === 0) {
    resetStyledTooltipViewportClamp(el);
    return;
  }

  el.style.setProperty(TOOLTIP_SHIFT_VAR, `${shift}px`);
}
