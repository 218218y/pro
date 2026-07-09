const TOOLTIP_VIEWPORT_GUTTER_PX = 8;
const TOOLTIP_MAX_WIDTH_PX = 320;
const TOOLTIP_RICH_MAX_WIDTH_PX = 144;
const TOOLTIP_PORTAL_ATTR = 'data-wp-r-tooltip-portal';
const TOOLTIP_ARROW_ATTR = 'data-wp-r-tooltip-arrow';
const TOOLTIP_TEXT_ATTR = 'data-tooltip';
const TOOLTIP_TITLE_ATTR = 'data-tooltip-title';
const TOOLTIP_DETAIL_ATTR = 'data-tooltip-detail';
const TOOLTIP_PLACEMENT_ATTR = 'data-tooltip-placement';
const TOOLTIP_TARGET_SELECTOR = [
  `.wp-r-styled-tooltip[${TOOLTIP_TEXT_ATTR}]`,
  `.wp-r-styled-tooltip[${TOOLTIP_TITLE_ATTR}]`,
  `.hint-bottom[${TOOLTIP_TEXT_ATTR}]`,
  `.cam-btn[${TOOLTIP_TEXT_ATTR}]`,
  `.wp-pdf-ui-hint[${TOOLTIP_TEXT_ATTR}]`,
  `.wp-qa-btn[${TOOLTIP_TITLE_ATTR}]`,
].join(',');
const TOOLTIP_PORTAL_OFFSET_PX = 10;
const TOOLTIP_ARROW_SIZE_PX = 6;
const TOOLTIP_ARROW_GUTTER_PX = 14;
const TOOLTIP_POSITION_VAR_X = '--wp-r-tooltip-left';
const TOOLTIP_POSITION_VAR_Y = '--wp-r-tooltip-top';
const TOOLTIP_ARROW_POSITION_VAR_X = '--wp-r-tooltip-arrow-left';
const TOOLTIP_ARROW_POSITION_VAR_Y = '--wp-r-tooltip-arrow-top';
const TOOLTIP_OPEN_CLASS = 'is-open';
const TOOLTIP_ABOVE_CLASS = 'is-above';
const TOOLTIP_BELOW_CLASS = 'is-below';
const TOOLTIP_SIDE_LEFT_CLASS = 'is-side-left';
const TOOLTIP_SIDE_RIGHT_CLASS = 'is-side-right';

const TOOLTIP_PLACEMENT_CLASSES = [
  TOOLTIP_ABOVE_CLASS,
  TOOLTIP_BELOW_CLASS,
  TOOLTIP_SIDE_LEFT_CLASS,
  TOOLTIP_SIDE_RIGHT_CLASS,
] as const;

type TooltipPlacement = 'above' | 'below' | 'side-left' | 'side-right';

type TooltipHost = {
  tooltip: HTMLElement;
  arrow: HTMLElement;
};

type TooltipContent = {
  text: string;
  title?: string;
  detail?: string;
  rich: boolean;
};

type TooltipCandidate = {
  placement: TooltipPlacement;
  left: number;
  top: number;
  hasRoom: boolean;
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

function readTooltipAttr(target: HTMLElement | null | undefined, attr: string): string | undefined {
  const text = String(target?.getAttribute(attr) || '').trim();
  return text || undefined;
}

function readTooltipContent(target: HTMLElement | null | undefined): TooltipContent | undefined {
  const text = readTooltipAttr(target, TOOLTIP_TEXT_ATTR);
  if (text) {
    return { text, rich: false };
  }

  const title = readTooltipAttr(target, TOOLTIP_TITLE_ATTR);
  const detail = readTooltipAttr(target, TOOLTIP_DETAIL_ATTR);
  const richText = [title, detail].filter(Boolean).join('\n');
  return richText ? { text: richText, title, detail, rich: true } : undefined;
}

function appendTooltipPart(
  doc: Document,
  parent: HTMLElement,
  className: string,
  text: string | undefined
): void {
  if (!text) return;
  const part = doc.createElement('span');
  part.className = className;
  part.textContent = text;
  parent.appendChild(part);
}

function renderTooltipContent(doc: Document, tooltip: HTMLElement, content: TooltipContent): void {
  tooltip.textContent = '';
  tooltip.classList.toggle('is-rich', content.rich);

  if (!content.rich) {
    tooltip.textContent = content.text;
    return;
  }

  appendTooltipPart(doc, tooltip, 'wp-r-floating-tooltip-title', content.title);
  appendTooltipPart(doc, tooltip, 'wp-r-floating-tooltip-detail', content.detail);
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
  el.style.whiteSpace = 'pre-line';
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

function removeTooltipPlacementClasses(el: HTMLElement | null | undefined): void {
  el?.classList.remove(...TOOLTIP_PLACEMENT_CLASSES);
}

function hideTooltipHost(doc: Document): void {
  const tooltip = doc.querySelector<HTMLElement>(`[${TOOLTIP_PORTAL_ATTR}="true"]`);
  const arrow = doc.querySelector<HTMLElement>(`[${TOOLTIP_ARROW_ATTR}="true"]`);
  tooltip?.classList.remove(TOOLTIP_OPEN_CLASS);
  arrow?.classList.remove(TOOLTIP_OPEN_CLASS);
  removeTooltipPlacementClasses(tooltip);
  removeTooltipPlacementClasses(arrow);
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

function isTooltipTargetConnected(target: HTMLElement | null): target is HTMLElement {
  return !!target && target.isConnected && target.matches(TOOLTIP_TARGET_SELECTOR);
}

function normalizePlacement(value: string | null | undefined): TooltipPlacement | null {
  switch (value) {
    case 'above':
    case 'below':
    case 'side-left':
    case 'side-right':
      return value;
    default:
      return null;
  }
}

function resolvePreferredPlacement(target: HTMLElement): TooltipPlacement {
  const explicit = normalizePlacement(target.getAttribute(TOOLTIP_PLACEMENT_ATTR));
  if (explicit) return explicit;

  if (target.classList.contains('wp-pdf-ui-hint--side-left')) return 'side-left';
  if (target.classList.contains('wp-pdf-ui-hint--side-right')) return 'side-right';
  if (target.classList.contains('wp-pdf-ui-hint--above')) return 'above';
  if (target.classList.contains('wp-r-tooltip-above')) return 'above';
  if (target.classList.contains('cam-btn') && !target.classList.contains('hint-bottom')) return 'above';
  return 'below';
}

function buildPlacementOrder(preferredPlacement: TooltipPlacement): TooltipPlacement[] {
  switch (preferredPlacement) {
    case 'above':
      return ['above', 'below', 'side-left', 'side-right'];
    case 'side-left':
      return ['side-left', 'side-right', 'above', 'below'];
    case 'side-right':
      return ['side-right', 'side-left', 'above', 'below'];
    case 'below':
    default:
      return ['below', 'above', 'side-left', 'side-right'];
  }
}

function getTooltipCandidate(
  placement: TooltipPlacement,
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number
): TooltipCandidate {
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  switch (placement) {
    case 'above': {
      const left = targetCenterX - tooltipWidth / 2;
      const top = targetRect.top - tooltipHeight - TOOLTIP_PORTAL_OFFSET_PX;
      return {
        placement,
        left,
        top,
        hasRoom: top >= TOOLTIP_VIEWPORT_GUTTER_PX,
      };
    }
    case 'side-left': {
      const left = targetRect.left - tooltipWidth - TOOLTIP_PORTAL_OFFSET_PX;
      const top = targetCenterY - tooltipHeight / 2;
      return {
        placement,
        left,
        top,
        hasRoom: left >= TOOLTIP_VIEWPORT_GUTTER_PX,
      };
    }
    case 'side-right': {
      const left = targetRect.right + TOOLTIP_PORTAL_OFFSET_PX;
      const top = targetCenterY - tooltipHeight / 2;
      return {
        placement,
        left,
        top,
        hasRoom: left + tooltipWidth <= viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX,
      };
    }
    case 'below':
    default: {
      const left = targetCenterX - tooltipWidth / 2;
      const top = targetRect.bottom + TOOLTIP_PORTAL_OFFSET_PX;
      return {
        placement: 'below',
        left,
        top,
        hasRoom: top + tooltipHeight <= viewportHeight - TOOLTIP_VIEWPORT_GUTTER_PX,
      };
    }
  }
}

function resolveTooltipCandidate(
  target: HTMLElement,
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number
): TooltipCandidate {
  const placements = buildPlacementOrder(resolvePreferredPlacement(target));
  const candidates = placements.map(placement =>
    getTooltipCandidate(placement, targetRect, tooltipWidth, tooltipHeight, viewportWidth, viewportHeight)
  );

  return candidates.find(candidate => candidate.hasRoom) || candidates[0];
}

function tooltipPlacementClass(placement: TooltipPlacement): string {
  switch (placement) {
    case 'above':
      return TOOLTIP_ABOVE_CLASS;
    case 'side-left':
      return TOOLTIP_SIDE_LEFT_CLASS;
    case 'side-right':
      return TOOLTIP_SIDE_RIGHT_CLASS;
    case 'below':
    default:
      return TOOLTIP_BELOW_CLASS;
  }
}

function positionTooltipHost(doc: Document, target: HTMLElement, content: TooltipContent): void {
  const win = doc.defaultView;
  const host = getOrCreateTooltipHost(doc);
  if (!win || !host) return;

  const viewportWidth = readViewportWidth(doc, win);
  const viewportHeight = readViewportHeight(doc, win);
  if (!viewportWidth || !viewportHeight) return;

  const availableWidth = Math.max(0, viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX * 2);
  const maxWidth = Math.min(content.rich ? TOOLTIP_RICH_MAX_WIDTH_PX : TOOLTIP_MAX_WIDTH_PX, availableWidth);
  const targetRect = target.getBoundingClientRect();

  renderTooltipContent(doc, host.tooltip, content);
  host.tooltip.style.maxWidth = `${maxWidth}px`;
  host.tooltip.style.width = content.rich ? `${maxWidth}px` : 'max-content';
  host.tooltip.classList.add(TOOLTIP_OPEN_CLASS);
  removeTooltipPlacementClasses(host.tooltip);
  removeTooltipPlacementClasses(host.arrow);
  host.tooltip.setAttribute('aria-hidden', 'false');

  const tooltipRect = host.tooltip.getBoundingClientRect();
  const tooltipWidth = Math.min(
    Math.ceil(tooltipRect.width || measureTooltipWidth(doc, viewportWidth, content.text)),
    maxWidth
  );
  const tooltipHeight = Math.ceil(tooltipRect.height || 0);
  const candidate = resolveTooltipCandidate(
    target,
    targetRect,
    tooltipWidth,
    tooltipHeight,
    viewportWidth,
    viewportHeight
  );

  const maxLeft = Math.max(
    TOOLTIP_VIEWPORT_GUTTER_PX,
    viewportWidth - TOOLTIP_VIEWPORT_GUTTER_PX - tooltipWidth
  );
  const maxTop = Math.max(
    TOOLTIP_VIEWPORT_GUTTER_PX,
    viewportHeight - TOOLTIP_VIEWPORT_GUTTER_PX - tooltipHeight
  );
  const left = clamp(candidate.left, TOOLTIP_VIEWPORT_GUTTER_PX, maxLeft);
  const top = clamp(candidate.top, TOOLTIP_VIEWPORT_GUTTER_PX, maxTop);
  const placementClass = tooltipPlacementClass(candidate.placement);

  let arrowLeft: number;
  let arrowTop: number;
  if (candidate.placement === 'side-left' || candidate.placement === 'side-right') {
    arrowLeft =
      candidate.placement === 'side-left'
        ? left + tooltipWidth + TOOLTIP_ARROW_SIZE_PX
        : left - TOOLTIP_ARROW_SIZE_PX;
    arrowTop = clamp(
      targetRect.top + targetRect.height / 2,
      top + TOOLTIP_ARROW_GUTTER_PX,
      top + tooltipHeight - TOOLTIP_ARROW_GUTTER_PX
    );
  } else {
    arrowLeft = clamp(
      targetRect.left + targetRect.width / 2,
      left + TOOLTIP_ARROW_GUTTER_PX,
      left + tooltipWidth - TOOLTIP_ARROW_GUTTER_PX
    );
    arrowTop =
      candidate.placement === 'below'
        ? top - TOOLTIP_ARROW_SIZE_PX
        : top + tooltipHeight + TOOLTIP_ARROW_SIZE_PX;
  }

  host.tooltip.style.setProperty(TOOLTIP_POSITION_VAR_X, `${Math.round(left)}px`);
  host.tooltip.style.setProperty(TOOLTIP_POSITION_VAR_Y, `${Math.round(top)}px`);
  host.tooltip.setAttribute('data-placement', candidate.placement);
  host.tooltip.classList.add(placementClass);

  host.arrow.style.setProperty(TOOLTIP_ARROW_POSITION_VAR_X, `${Math.round(arrowLeft)}px`);
  host.arrow.style.setProperty(TOOLTIP_ARROW_POSITION_VAR_Y, `${Math.round(arrowTop)}px`);
  host.arrow.setAttribute('data-placement', candidate.placement);
  host.arrow.classList.add(TOOLTIP_OPEN_CLASS, placementClass);

  activeTooltipTarget = target;
}

export function installStyledTooltipViewportHost(doc: Document): () => void {
  const showFromTarget = (target: HTMLElement | null): void => {
    const content = readTooltipContent(target);
    if (!target || !content) {
      hideTooltipHost(doc);
      return;
    }
    positionTooltipHost(doc, target, content);
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
    const content = readTooltipContent(activeTooltipTarget);
    if (!content || !isTooltipTargetConnected(activeTooltipTarget)) {
      hideTooltipHost(doc);
      return;
    }
    positionTooltipHost(doc, activeTooltipTarget, content);
  };

  const handleTooltipMutation = (mutations: MutationRecord[]): void => {
    const target = activeTooltipTarget;
    if (!target) return;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target === target) {
        if (
          mutation.attributeName === TOOLTIP_TEXT_ATTR ||
          mutation.attributeName === TOOLTIP_TITLE_ATTR ||
          mutation.attributeName === TOOLTIP_DETAIL_ATTR ||
          mutation.attributeName === TOOLTIP_PLACEMENT_ATTR ||
          mutation.attributeName === 'class'
        ) {
          showFromTarget(isTooltipTargetConnected(target) ? target : null);
          return;
        }
      }

      if (mutation.type === 'childList' && !target.isConnected) {
        hideTooltipHost(doc);
        return;
      }
    }
  };

  const TooltipMutationObserver = doc.defaultView?.MutationObserver;
  const tooltipMutationObserver = TooltipMutationObserver
    ? new TooltipMutationObserver(handleTooltipMutation)
    : null;
  tooltipMutationObserver?.observe(doc.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      TOOLTIP_TEXT_ATTR,
      TOOLTIP_TITLE_ATTR,
      TOOLTIP_DETAIL_ATTR,
      TOOLTIP_PLACEMENT_ATTR,
      'class',
    ],
  });

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
    tooltipMutationObserver?.disconnect();
    hideTooltipHost(doc);
  };
}

export const __styledTooltipPlacementTestSeams = {
  TOOLTIP_TEXT_ATTR,
  TOOLTIP_TITLE_ATTR,
  TOOLTIP_DETAIL_ATTR,
  TOOLTIP_PLACEMENT_ATTR,
  TOOLTIP_TARGET_SELECTOR,
};
