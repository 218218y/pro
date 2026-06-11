export type ResizeObserverCtorLike = new (callback: ResizeObserverCallback) => ResizeObserver;

function isResizeObserverCtorLike(value: unknown): value is ResizeObserverCtorLike {
  return typeof value === 'function';
}

export function getNodeDocument(node: Node | null | undefined): Document | null {
  return node && 'ownerDocument' in node ? node.ownerDocument || null : null;
}

export function getNodeWindow(node: Node | null | undefined): Window | null {
  const doc = getNodeDocument(node);
  return doc && doc.defaultView ? doc.defaultView : null;
}

export function getWindowResizeObserver(win: Window | null | undefined): ResizeObserverCtorLike | null {
  const candidate = win ? Reflect.get(win, 'ResizeObserver') : null;
  if (isResizeObserverCtorLike(candidate)) return candidate;
  return typeof ResizeObserver === 'function' ? ResizeObserver : null;
}

function isElementLike(value: unknown): value is Element {
  return (
    !!value && typeof value === 'object' && typeof (value as Element).getBoundingClientRect === 'function'
  );
}

function listObservedViewportTargets(targets: ReadonlyArray<Element | null | undefined>): Element[] {
  const next: Element[] = [];
  for (const target of targets) {
    if (!isElementLike(target) || next.includes(target)) continue;
    next.push(target);
  }
  return next;
}

function scheduleViewportLayoutFrame(win: Window, frameRef: { current: number }, onUpdate: () => void): void {
  if (typeof win.requestAnimationFrame !== 'function') {
    onUpdate();
    return;
  }
  if (frameRef.current && typeof win.cancelAnimationFrame === 'function') {
    win.cancelAnimationFrame(frameRef.current);
  }
  frameRef.current = win.requestAnimationFrame(() => {
    frameRef.current = 0;
    onUpdate();
  });
}

function cancelViewportLayoutFrame(win: Window, frameRef: { current: number }): void {
  if (!frameRef.current || typeof win.cancelAnimationFrame !== 'function') return;
  win.cancelAnimationFrame(frameRef.current);
  frameRef.current = 0;
}

export function observeViewportLayout(args: {
  doc: Document;
  win: Window;
  onUpdate: () => void;
  observeScroll?: boolean;
  resizeTargets?: ReadonlyArray<Element | null | undefined>;
}): () => void {
  const { doc, win, onUpdate, observeScroll = true, resizeTargets = [] } = args;
  const frameRef = { current: 0 };
  const scheduleUpdate = () => {
    scheduleViewportLayoutFrame(win, frameRef, onUpdate);
  };

  scheduleUpdate();
  win.addEventListener('resize', scheduleUpdate, { passive: true });
  if (observeScroll) doc.addEventListener('scroll', scheduleUpdate, true);

  const ResizeObserverCtor = getWindowResizeObserver(win);
  const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(() => scheduleUpdate()) : null;
  for (const target of listObservedViewportTargets(resizeTargets)) {
    resizeObserver?.observe(target);
  }

  return () => {
    cancelViewportLayoutFrame(win, frameRef);
    win.removeEventListener('resize', scheduleUpdate);
    if (observeScroll) doc.removeEventListener('scroll', scheduleUpdate, true);
    resizeObserver?.disconnect();
  };
}
