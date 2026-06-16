const TOOLTIP_VIEWPORT_GUTTER_PX = 8;
const TOOLTIP_MAX_WIDTH_PX = 320;
const TOOLTIP_SHIFT_VAR = '--wp-r-tooltip-shift-x';
const TOOLTIP_SHIFT_ZERO = '0px';
const TOOLTIP_PORTAL_ATTR = 'data-wp-r-tooltip-portal';
const TOOLTIP_ARROW_ATTR = 'data-wp-r-tooltip-arrow';
const TOOLTIP_TARGET_SELECTOR = '.wp-r-styled-tooltip.hint-bottom[data-tooltip]';
const TOOLTIP_PORTAL_OFFSET_PX = 10;
const TOOLTIP_ARROW_SIZE_PX = 6;
const TOOLTIP_ARROW_GUTTER_PX = 14;
const TOOLTIP_POSITION_VAR_X = '--wp-r-tooltip-left';
const TOOLTIP_POSITION_VAR_Y = '--wp-r-tooltip-top';
const TOOLTIP_ARROW_POSITION_VAR_X = '--wp-r-tooltip-arrow-left';
const TOOLTIP_ARROW_POSITION_VAR_Y = '--wp-r-tooltip-arrow-top';
const TOOLTIP_SHIFT_VAR_VALUE = `var(${TOOLTIP_SHIFT_VAR})`;
const TOOLTIP_OPEN_CLASS = 'is-open';
const TOOLTIP_ABOVE_CLASS = 'is-above';
const TOOLTIP_BELOW_CLASS = 'is-below';

type TooltipHost = {
  tooltip: HTMLElement;
  arrow: HTMLElement;
};

let tooltipMeasureEl: HTMLElement | null = null;
let activeTooltipTarget: HTMLElement | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readViewportWidth(doc: Document, win: Window): number {
  return Math.max(0, doc.documentElement.clientWidth || win.innerWidth || 0);
}

function readViewportHeight(doc: Document, win: Window): number {
  return Math.max(0, doc.documentElement.clientHeight || win.innerHeight || 0);
}

function readTooltipText(value: string | null | undefined): string | undefined {
  const text = String(value || '').trim();
  return text || undefined;
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

function getOrCreateTooltipHost(doc: Document): TooltipHost | null {
  if (!doc.body) return null;

  const existingTooltip = doc.querySelector<HTMLElement>(`[${TOOLTIP_PORTAL_ATTR}="true"]`);
  const existingArrow = doc.querySelector<HTMLElement>(`[${TOOLTIP_ARROW_ATTR}="true"]`);
  if (existingTooltip && existingArrow) return { tooltip: existingTooltip, arrow: existingArrow };

  existingTooltip?.remove();
  existingArrow?.remove();

  const tooltip = doc.createElement('div');
  tooltip.setAttribute(TOOLTIP_PORTAL_ATTR, 'true');
  tooltip.className = 'wp-r-floating-tooltip';
  tooltip.style.zIndex = 'var(--wp-z-tooltip)';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.setAttribute('aria-hidden', 'true');

  const arrow = doc.createElement('div');
  arrow.setAttribute(TOOLTIP_ARROW_ATTR, 'true');
  arrow.className = 'wp-r-floating-tooltip-arrow';
  arrow.style.zIndex = 'var(--wp-z-tooltip)';
  arrow.setAttribute('aria-hidden', 'true');

  doc.body.appendChild(tooltip);
  doc.body.appendChild(arrow);
  return { tooltip, arrow };
}

function hideTooltipHost(doc: Document): void {
  const tooltip = doc.querySelector<HTMLElement>(`[${TOOLTIP_PORTAL_ATTR}="true"]`);
  const arrow = doc.querySelector<HTMLElement>(`[${TOOLTIP_ARROW_ATTR}="true"]`);
  tooltip?.classList.remove(TOOLTIP_OPEN_CLASS, TOOLTIP_ABOVE_CLASS, TOOLTIP_BELOW_CLASS);
  arrow?.classList.remove(TOOLTIP_OPEN_CLASS, TOOLTIP_ABOVE_CLASS, TOOLTIP_BELOW_CLASS);
  tooltip?.setAttribute('aria-hidden', 'true');
  tooltip?.removeAttribute('data-placement');
  arrow?.removeAttribute('data-placement');
  activeTooltipTarget = null;
}

function isElementLike(value: EventTarget | null): value is Element {
  return !!value && typeof value === 'object' && typeof (value as Element).closest === 'function';
}

function isNodeLike(value: EventTarget | null): value is Node {
  return !!value && typeof value === 'object' && typeof (value as Node).nodeType === 'number';
}

function findTooltipTarget(value: EventTarget | null): HTMLElement | null {
  if (!isElementLike(value)) return null;
  const target = value.closest(TOOLTIP_TARGET_SELECTOR);
  return target && typeof (target as HTMLElement).style === 'object' ? (target as HTMLElement) : null;
}

function isInsideTargetOrTooltip(
  target: EventTarget | null,
  active: HTMLElement | null,
  host: TooltipHost | null
): boolean {
  if (!isNodeLike(target)) return false;
  return !!(
    (active && active.contains(target)) ||
    (host?.tooltip && host.tooltip.contains(target)) ||
    (host?.arrow && host.arrow.contains(target))
  );
}

function positionTooltipHost(doc: Document, target: HTMLElement, text: string): void {
  const win = doc.defaultView;
  const host = getOrCreateTooltipHost(doc);
  if (!win || !host) return;

  const viewportWidth = readViewportWidth(doc, win);
  const viewportHeight = readViewportHeight(doc, win);
  if (!viewportWidth || !viewportHeight) return;

  const availableWidth = Math.max(0, viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX * 2);
  const maxWidth = Math.min(TOOLTIP_MAX_WIDTH_PX, availableWidth);
  const targetRect = target.getBoundingClientRect();

  host.tooltip.textContent = text;
  host.tooltip.style.maxWidth = `${maxWidth}px`;
  host.tooltip.style.width = 'max-content';
  host.tooltip.classList.add(TOOLTIP_OPEN_CLASS);
  host.tooltip.classList.remove(TOOLTIP_ABOVE_CLASS, TOOLTIP_BELOW_CLASS);
  host.tooltip.setAttribute('aria-hidden', 'false');

  const tooltipRect = host.tooltip.getBoundingClientRect();
  const tooltipWidth = Math.min(
    Math.ceil(tooltipRect.width || measureTooltipWidth(doc, viewportWidth, text)),
    maxWidth
  );
  const tooltipHeight = Math.ceil(tooltipRect.height || 0);
  const desiredLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  const maxLeft = Math.max(
    TOOLTIP_VIEWPORT_GUTTER_PX,
    viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX - tooltipWidth
  );
  const left = clamp(desiredLeft, TOOLTIP_VIEWPORT_GUTTER_PX, maxLeft);

  const belowTop = targetRect.bottom + TOOLTIP_PORTAL_OFFSET_PX;
  const aboveTop = targetRect.top - tooltipHeight - TOOLTIP_PORTAL_OFFSET_PX;
  const hasRoomBelow = belowTop + tooltipHeight <= viewportHeight - TOOLTIP_VIEWPORT_GUTTER_PX;
  const hasRoomAbove = aboveTop >= TOOLTIP_VIEWPORT_GUTTER_PX;
  const placement = hasRoomBelow || !hasRoomAbove ? 'below' : 'above';
  const rawTop = placement === 'below' ? belowTop : aboveTop;
  const maxTop = Math.max(
    TOOLTIP_VIEWPORT_GUTTER_PX,
    viewportHeight - TOOLTIP_VIEWPORT_GUTTER_PX - tooltipHeight
  );
  const top = clamp(rawTop, TOOLTIP_VIEWPORT_GUTTER_PX, maxTop);

  const anchorCenter = clamp(
    targetRect.left + targetRect.width / 2,
    left + TOOLTIP_ARROW_GUTTER_PX,
    left + tooltipWidth - TOOLTIP_ARROW_GUTTER_PX
  );
  const arrowTop =
    placement === 'below' ? top - TOOLTIP_ARROW_SIZE_PX : top + tooltipHeight + TOOLTIP_ARROW_SIZE_PX;

  host.tooltip.style.setProperty(TOOLTIP_POSITION_VAR_X, `${Math.round(left)}px`);
  host.tooltip.style.setProperty(TOOLTIP_POSITION_VAR_Y, `${Math.round(top)}px`);
  host.tooltip.setAttribute('data-placement', placement);
  host.tooltip.classList.add(placement === 'below' ? TOOLTIP_BELOW_CLASS : TOOLTIP_ABOVE_CLASS);

  host.arrow.style.setProperty(TOOLTIP_ARROW_POSITION_VAR_X, `${Math.round(anchorCenter)}px`);
  host.arrow.style.setProperty(TOOLTIP_ARROW_POSITION_VAR_Y, `${Math.round(arrowTop)}px`);
  host.arrow.setAttribute('data-placement', placement);
  host.arrow.classList.add(
    TOOLTIP_OPEN_CLASS,
    placement === 'below' ? TOOLTIP_BELOW_CLASS : TOOLTIP_ABOVE_CLASS
  );
  host.arrow.classList.remove(placement === 'below' ? TOOLTIP_ABOVE_CLASS : TOOLTIP_BELOW_CLASS);

  activeTooltipTarget = target;
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
  } else {
    el.style.setProperty(TOOLTIP_SHIFT_VAR, `${shift}px`);
  }

  positionTooltipHost(doc, el, tooltip);
}

export function installStyledTooltipViewportHost(doc: Document): () => void {
  const showFromTarget = (target: HTMLElement | null): void => {
    const text = readTooltipText(target?.getAttribute('data-tooltip'));
    if (!target || !text) {
      hideTooltipHost(doc);
      return;
    }
    positionTooltipHost(doc, target, text);
  };

  const handleMouseOver = (event: MouseEvent): void => {
    const target = findTooltipTarget(event.target);
    if (!target || target === activeTooltipTarget) return;
    showFromTarget(target);
  };

  const handleMouseOut = (event: MouseEvent): void => {
    if (!activeTooltipTarget) return;
    const host = getOrCreateTooltipHost(doc);
    if (isInsideTargetOrTooltip(event.relatedTarget, activeTooltipTarget, host)) return;
    hideTooltipHost(doc);
  };

  const handleFocusIn = (event: FocusEvent): void => {
    showFromTarget(findTooltipTarget(event.target));
  };

  const handleFocusOut = (event: FocusEvent): void => {
    if (!activeTooltipTarget) return;
    const host = getOrCreateTooltipHost(doc);
    if (isInsideTargetOrTooltip(event.relatedTarget, activeTooltipTarget, host)) return;
    hideTooltipHost(doc);
  };

  const handleScrollOrResize = (): void => {
    if (!activeTooltipTarget) return;
    const text = readTooltipText(activeTooltipTarget.getAttribute('data-tooltip'));
    if (!text || !activeTooltipTarget.isConnected) {
      hideTooltipHost(doc);
      return;
    }
    positionTooltipHost(doc, activeTooltipTarget, text);
  };

  doc.addEventListener('mouseover', handleMouseOver, true);
  doc.addEventListener('mouseout', handleMouseOut, true);
  doc.addEventListener('focusin', handleFocusIn, true);
  doc.addEventListener('focusout', handleFocusOut, true);
  doc.addEventListener('scroll', handleScrollOrResize, true);
  doc.defaultView?.addEventListener('resize', handleScrollOrResize);

  return () => {
    doc.removeEventListener('mouseover', handleMouseOver, true);
    doc.removeEventListener('mouseout', handleMouseOut, true);
    doc.removeEventListener('focusin', handleFocusIn, true);
    doc.removeEventListener('focusout', handleFocusOut, true);
    doc.removeEventListener('scroll', handleScrollOrResize, true);
    doc.defaultView?.removeEventListener('resize', handleScrollOrResize);
    hideTooltipHost(doc);
  };
}

export const __styledTooltipPlacementTestSeams = {
  TOOLTIP_TARGET_SELECTOR,
  TOOLTIP_SHIFT_VAR_VALUE,
};
