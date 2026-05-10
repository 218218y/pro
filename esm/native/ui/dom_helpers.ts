type ElementLike = {
  nodeType?: unknown;
  getBoundingClientRect?: unknown;
  innerHTML?: unknown;
  outerHTML?: unknown;
};

function isElementLike(value: unknown): value is ElementLike {
  return !!value && typeof value === 'object';
}

function readSerializerCtor(doc: Document | null | undefined): typeof XMLSerializer | null {
  const win = doc && doc.defaultView ? doc.defaultView : null;
  if (!win) return null;
  try {
    const ctor = Reflect.get(win, 'XMLSerializer');
    return typeof ctor === 'function' ? ctor : null;
  } catch {
    return null;
  }
}

function isHtmlElement<T extends HTMLElement = HTMLElement>(value: unknown): value is T {
  return isElementLike(value) && value.nodeType === 1 && typeof value.getBoundingClientRect === 'function';
}

export function asHTMLElement<T extends HTMLElement = HTMLElement>(value: unknown): T | null {
  return isHtmlElement<T>(value) ? value : null;
}

export function getElementByIdHtml<T extends HTMLElement = HTMLElement>(
  doc: Document | null | undefined,
  id: string
): T | null {
  try {
    const el = doc && typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
    return asHTMLElement<T>(el);
  } catch {
    return null;
  }
}

export function queryHtmlElement<T extends HTMLElement = HTMLElement>(
  root: ParentNode | null | undefined,
  selector: string
): T | null {
  try {
    const el = root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
    return asHTMLElement<T>(el);
  } catch {
    return null;
  }
}

export function toggleElementClass(el: Element | null | undefined, className: string, force?: boolean): void {
  try {
    if (!el || !el.classList || !className) return;
    if (typeof force === 'boolean') el.classList.toggle(className, force);
    else el.classList.toggle(className);
  } catch {
    // ignore classList failures
  }
}

export function toggleBodyClass(doc: Document | null | undefined, className: string, force: boolean): void {
  try {
    const body = doc && doc.body ? doc.body : null;
    if (!body) return;
    toggleElementClass(body, className, force);
  } catch {
    // ignore body/class failures
  }
}

export function readInnerHtml(el: Element | null | undefined): string {
  try {
    return isElementLike(el) && typeof el.innerHTML === 'string' ? String(el.innerHTML) : '';
  } catch {
    return '';
  }
}

export function createDetachedHtmlRoot(
  doc: Document | null | undefined,
  html: string
): HTMLDivElement | null {
  if (!doc || typeof doc.createElement !== 'function') return null;
  try {
    const root = doc.createElement('div');
    root.innerHTML = String(html || '');
    return root;
  } catch {
    return null;
  }
}

export function serializeDetachedHtmlNode(
  doc: Document | null | undefined,
  node: Element | DocumentFragment | null | undefined
): string {
  if (!node) return '';

  try {
    const XMLSerializerCtor = readSerializerCtor(doc);
    if (typeof XMLSerializerCtor === 'function') return new XMLSerializerCtor().serializeToString(node);
  } catch {
    // fall through to HTML serialization branches
  }

  try {
    if (isElementLike(node) && typeof node.outerHTML === 'string') {
      return String(node.outerHTML || '');
    }
  } catch {
    // ignore outerHTML failure
  }

  try {
    if (isElementLike(node) && typeof node.innerHTML === 'string') {
      return String(node.innerHTML || '');
    }
  } catch {
    // ignore innerHTML failure
  }

  return '';
}
