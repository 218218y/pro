import type { ViewerSearchDestination, SearchRevealStep } from './viewer_search_catalog.js';

/** Execute only explicit navigation actions. Never click the final choice itself. */
export type ViewerSearchProgress = 'found' | 'waiting';

function visible(element: Element): boolean {
  return element.getClientRects().length > 0 && !element.closest('[hidden], [aria-hidden="true"], .hidden');
}

function needsAction(element: Element, step: SearchRevealStep): boolean {
  switch (step.action) {
    case 'check':
      return element instanceof element.ownerDocument.defaultView!.HTMLInputElement && !element.checked;
    case 'press':
      return element.getAttribute('aria-pressed') !== 'true';
    case 'open':
      return element instanceof element.ownerDocument.defaultView!.HTMLDetailsElement && !element.open;
    case 'activate':
      return element.getAttribute('aria-pressed') !== 'true' && !element.classList.contains('is-selected');
  }
}

function applyAction(element: Element, step: SearchRevealStep): void {
  if (step.action === 'open') {
    (element as HTMLDetailsElement).open = true;
    return;
  }
  (element as HTMLElement).click();
}

/**
 * Each call is safe after an asynchronous React commit. `acted` prevents a second click
 * on an editor-mode toggle while the first event is still being reconciled.
 */
export function advanceViewerSearchNavigation(
  panel: HTMLElement,
  route: ViewerSearchDestination,
  acted: Set<number>
): { progress: ViewerSearchProgress; target?: HTMLElement } {
  // Resolve the route's required context first. A shared control can appear in more
  // than one mode (e.g. interior shelves in both grid and sketch), so finding its
  // selector alone is not proof that we reached the requested option.
  const visibleTarget = panel.querySelector<HTMLElement>(route.selector);
  for (const [index, step] of route.reveal.entries()) {
    // A generic adhesive-glass dimension is valid for either black or frosted
    // glass. Only select the default material when its editor is not present.
    if (step.onlyIfTargetMissing && visibleTarget && visible(visibleTarget)) continue;
    const control = panel.querySelector<HTMLElement>(step.selector);
    if (!control || !visible(control)) return { progress: 'waiting' };
    if (needsAction(control, step)) {
      if (acted.has(index)) return { progress: 'waiting' };
      acted.add(index);
      applyAction(control, step);
      return { progress: 'waiting' };
    }
  }
  const target = panel.querySelector<HTMLElement>(route.selector);
  if (target && visible(target)) return { progress: 'found', target };
  // React may still be mounting a lazy tab or rendering a newly activated mode.
  // Never substitute an unrelated node or scroll to the tab top as a fake success.
  return { progress: 'waiting' };
}

export function revealViewerSearchTarget(scroller: HTMLElement, target: HTMLElement): () => void {
  const scrollerRect = scroller.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset = targetRect.top - scrollerRect.top;
  const requestedTop = scroller.scrollTop + offset - (scroller.clientHeight - targetRect.height) / 2;
  scroller.scrollTop = Math.max(0, requestedTop);

  target.classList.remove('wp-r-search-target-flash');
  // Restart the animation if the same result was selected again.
  void target.offsetWidth;
  target.classList.add('wp-r-search-target-flash');
  const view = target.ownerDocument.defaultView;
  const timeout = view?.setTimeout(() => target.classList.remove('wp-r-search-target-flash'), 2100);
  return () => {
    if (timeout !== undefined) view?.clearTimeout(timeout);
    target.classList.remove('wp-r-search-target-flash');
  };
}
