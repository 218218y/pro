import test from 'node:test';
import assert from 'node:assert/strict';

import { openCustomPrompt } from '../esm/native/ui/feedback_modal.ts';

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

  toString(): string {
    return Array.from(this.classes).join(' ');
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

  get nextSibling(): FakeElement | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx >= 0 ? this.parentNode.children[idx + 1] || null : null;
  }

  appendChild(child: FakeElement): FakeElement {
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    this.ownerDocument.register(child);
    return child;
  }

  insertBefore(child: FakeElement, reference: FakeElement | null | undefined): FakeElement {
    child.parentNode = this;
    child.parentElement = this;
    const idx = reference ? this.children.indexOf(reference) : -1;
    if (idx >= 0) this.children.splice(idx, 0, child);
    else this.children.push(child);
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

  focus(): void {}

  select(): void {}

  addEventListener(type: string, listener: Listener): void {
    const bucket = this.listeners.get(type) || new Set<Listener>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  click(): void {
    for (const listener of this.listeners.get('click') || []) listener({} as Event);
  }

  dispatchKey(key: string): void {
    const event = {
      key,
      preventDefault() {},
      stopPropagation() {},
    } as Event & { key: string };
    for (const listener of this.listeners.get('keydown') || []) listener(event);
  }

  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('#')) return this.ownerDocument.getElementById(selector.slice(1));
    return null;
  }
}

class FakeInputElement extends FakeElement {
  value = '';
  constructor(doc: FakeDocument) {
    super(doc, 'input');
  }
}

class FakeButtonElement extends FakeElement {
  constructor(doc: FakeDocument) {
    super(doc, 'button');
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
    const lower = String(tag || '').toLowerCase();
    if (lower === 'input') return new FakeInputElement(this);
    if (lower === 'button') return new FakeButtonElement(this);
    return new FakeElement(this, lower);
  }

  getElementById(id: string): FakeElement | null {
    return this.byId.get(String(id || '')) || null;
  }

  querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('#')) return this.getElementById(selector.slice(1));
    return null;
  }

  register(el: FakeElement): void {
    if (el.id) this.byId.set(el.id, el);
  }
}

function createModalTree(doc: FakeDocument) {
  const modal = new FakeElement(doc, 'div');
  modal.id = 'customPromptModal';
  const shell = new FakeElement(doc, 'div');
  const title = new FakeElement(doc, 'div');
  title.id = 'modalTitle';
  const input = new FakeInputElement(doc);
  input.id = 'modalInput';
  const confirmBtn = new FakeButtonElement(doc);
  confirmBtn.id = 'modalConfirmBtn';
  const cancelBtn = new FakeButtonElement(doc);
  cancelBtn.id = 'modalCancelBtn';

  modal.appendChild(shell);
  shell.appendChild(title);
  shell.appendChild(input);
  shell.appendChild(confirmBtn);
  shell.appendChild(cancelBtn);
  doc.body.appendChild(modal);

  return { modal, title, input, confirmBtn, cancelBtn };
}

function createAppHarness() {
  const doc = new FakeDocument();
  const win = {
    document: doc,
    navigator: { userAgent: 'node-test' },
    location: { href: 'http://localhost/' },
    setTimeout(cb: () => void) {
      cb();
      return 1;
    },
    clearTimeout() {},
  };
  doc.defaultView = win;
  const elements = createModalTree(doc);
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
    elements,
    remountModal() {
      const next = createModalTree(doc);
      return next;
    },
  };
}

function withFakeHtmlGlobals<T>(run: () => T): T {
  const g = globalThis as typeof globalThis & {
    HTMLElement?: unknown;
    HTMLInputElement?: unknown;
    HTMLButtonElement?: unknown;
  };
  const prevElement = g.HTMLElement;
  const prevInput = g.HTMLInputElement;
  const prevButton = g.HTMLButtonElement;
  g.HTMLElement = FakeElement as unknown;
  g.HTMLInputElement = FakeInputElement as unknown;
  g.HTMLButtonElement = FakeButtonElement as unknown;
  try {
    return run();
  } finally {
    g.HTMLElement = prevElement;
    g.HTMLInputElement = prevInput;
    g.HTMLButtonElement = prevButton;
  }
}

test('custom prompt cancel resolves callback with null', () => {
  withFakeHtmlGlobals(() => {
    const { App, elements } = createAppHarness();
    let seen: string | null | undefined = undefined;

    openCustomPrompt(App, 'שם', 'demo', value => {
      seen = value;
    });

    elements.cancelBtn.click();
    assert.equal(seen, null);
  });
});

test('custom prompt rebinds handlers after modal DOM is remounted', () => {
  withFakeHtmlGlobals(() => {
    const { App, elements, remountModal } = createAppHarness();
    const seen: Array<string | null> = [];

    openCustomPrompt(App, 'ראשון', 'a', value => {
      seen.push(value);
    });
    elements.cancelBtn.click();

    const next = remountModal();
    openCustomPrompt(App, 'שני', 'b', value => {
      seen.push(value);
    });
    next.cancelBtn.click();

    assert.deepEqual(seen, [null, null]);
  });
});
