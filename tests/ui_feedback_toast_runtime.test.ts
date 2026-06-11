import test from 'node:test';
import assert from 'node:assert/strict';

import { showToast, updateEditStateToast } from '../esm/native/ui/feedback_toast.ts';

type Listener = (event?: Event | unknown) => void;

class FakeClassList {
  private classes = new Set<string>();

  add(...tokens: string[]): void {
    for (const token of tokens) {
      const value = String(token || '').trim();
      if (value) this.classes.add(value);
    }
  }

  remove(...tokens: string[]): void {
    for (const token of tokens) this.classes.delete(String(token || '').trim());
  }

  contains(token: string): boolean {
    return this.classes.has(String(token || '').trim());
  }

  setFromString(value: string): void {
    this.classes.clear();
    for (const token of String(value || '').split(/\s+/)) this.add(token);
  }
}

class FakeElement {
  nodeType = 1;
  ownerDocument: FakeDocument;
  tagName: string;
  parentNode: FakeElement | null = null;
  parentElement: FakeElement | null = null;
  children: FakeElement[] = [];
  style: Record<string, string> = {};
  textContent = '';
  private _id = '';
  private _className = '';
  readonly classList = new FakeClassList();
  private listeners = new Map<string, Set<Listener>>();

  constructor(doc: FakeDocument, tagName: string) {
    this.ownerDocument = doc;
    this.tagName = tagName.toUpperCase();
  }

  get id(): string {
    return this._id;
  }

  set id(value: string) {
    this._id = String(value || '');
    this.ownerDocument.register(this);
  }

  get className(): string {
    return this._className;
  }

  set className(value: string) {
    this._className = String(value || '');
    this.classList.setFromString(this._className);
  }

  appendChild(child: FakeElement): FakeElement {
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    this.ownerDocument.register(child);
    return child;
  }

  remove(): void {
    if (!this.parentNode) return;
    const idx = this.parentNode.children.indexOf(this);
    if (idx >= 0) this.parentNode.children.splice(idx, 1);
    this.parentNode = null;
    this.parentElement = null;
  }

  addEventListener(type: string, listener: Listener): void {
    const bucket = this.listeners.get(type) || new Set<Listener>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  querySelector(selector: string): FakeElement | null {
    const needle = String(selector || '');
    if (needle.startsWith('#')) return this.ownerDocument.getElementById(needle.slice(1));
    if (needle.startsWith('.')) return this.findByClass(needle.slice(1));
    return null;
  }

  private findByClass(className: string): FakeElement | null {
    for (const child of this.children) {
      if (child.classList.contains(className)) return child;
      const nested = child.findByClass(className);
      if (nested) return nested;
    }
    return null;
  }
}

class FakeDocument {
  private byId = new Map<string, FakeElement>();
  body: FakeElement;
  documentElement: FakeElement;
  defaultView: any;

  constructor() {
    this.body = new FakeElement(this, 'body');
    this.documentElement = new FakeElement(this, 'html');
    this.defaultView = null;
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(this, tag);
  }

  createTextNode(text: string): FakeElement {
    const node = new FakeElement(this, '#text');
    node.textContent = String(text || '');
    return node;
  }

  getElementById(id: string): FakeElement | null {
    return this.byId.get(String(id || '')) || null;
  }

  querySelector(selector: string): FakeElement | null {
    const needle = String(selector || '');
    if (needle.startsWith('#')) return this.getElementById(needle.slice(1));
    return this.body.querySelector(needle) || this.documentElement.querySelector(needle);
  }

  querySelectorAll(selector: string): FakeElement[] {
    const found = this.querySelector(selector);
    return found ? [found] : [];
  }

  register(el: FakeElement): void {
    if (el.id) this.byId.set(el.id, el);
  }
}

function createHarness() {
  const doc = new FakeDocument();
  const timers: Array<() => void> = [];
  const win = {
    document: doc,
    navigator: { userAgent: 'node-test' },
    location: { href: 'http://localhost/' },
    setTimeout(cb: () => void) {
      timers.push(cb);
      return timers.length;
    },
    clearTimeout() {},
  };
  doc.defaultView = win;

  const viewer = doc.createElement('div');
  viewer.id = 'viewer-container';
  doc.body.appendChild(viewer);

  const App = {
    services: {},
    deps: {
      browser: {
        document: doc,
        window: win,
        navigator: win.navigator,
        location: win.location,
      },
    },
  } as any;

  return {
    App,
    doc,
    viewer,
    flushOne() {
      const next = timers.shift();
      next?.();
    },
    flushAll() {
      while (timers.length > 0) {
        const next = timers.shift();
        next?.();
      }
    },
  };
}

function withFakeHtmlGlobals<T>(run: () => T): T {
  const g = globalThis as typeof globalThis & { HTMLElement?: unknown };
  const prevElement = g.HTMLElement;
  g.HTMLElement = FakeElement as unknown;
  try {
    return run();
  } finally {
    g.HTMLElement = prevElement;
  }
}

test('showToast creates a canonical toast container and removes the toast after its timers flush', () => {
  withFakeHtmlGlobals(() => {
    const { App, doc, flushOne, flushAll } = createHarness();

    showToast(App, 'saved ok', 'success');

    const container = doc.getElementById('toastContainer');
    assert.ok(container);
    assert.equal(container?.children.length, 1);

    const toast = container?.children[0] || null;
    assert.ok(toast);
    assert.equal(toast?.classList.contains('toast-success'), true);

    flushOne();
    assert.equal(toast?.classList.contains('show'), true);

    flushAll();
    assert.equal(container?.children.length, 0);
  });
});

test('updateEditStateToast mounts sticky status toast under the viewer host and keeps hint content canonical', () => {
  withFakeHtmlGlobals(() => {
    const { App, viewer } = createHarness();

    updateEditStateToast(App, 'עריכת הערות פעילה', true);

    const toast = viewer.children.find(child => child.id === 'stickyStatusToast') || null;
    assert.ok(toast);
    assert.equal(toast?.classList.contains('active'), true);
    assert.equal(toast?.style.cursor, 'pointer');

    const label = toast?.querySelector('.status-label');
    const hint = toast?.querySelector('.status-hint');

    assert.equal(label?.textContent, 'עריכת הערות פעילה');
    assert.equal(hint?.textContent, 'לחץ על ההודעה כדי לצאת ממצב העריכה');

    updateEditStateToast(App, '', false);
    assert.equal(toast?.classList.contains('active'), false);
  });
});
