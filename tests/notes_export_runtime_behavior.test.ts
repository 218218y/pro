import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldIncludeNotesInExport } from '../esm/native/ui/notes_export_visibility.ts';
import { renderAllNotesToCanvas } from '../esm/native/ui/notes_export_render_runtime.ts';
import { installNotesExport } from '../esm/native/ui/notes_export.ts';
import { getUiNotesExportServiceMaybe } from '../esm/native/runtime/ui_notes_export_access.ts';

type RectLike = { left: number; top: number; width: number; height: number };

type FakeStyle = {
  display?: string;
  direction?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  getPropertyValue: (key: string) => string;
};

type FakeElement = {
  nodeType: 1;
  tagName: string;
  id?: string;
  textContent?: string;
  innerText?: string;
  innerHTML?: string;
  outerHTML?: string;
  dir?: string;
  ownerDocument?: FakeDocument;
  classList?: { contains: (name: string) => boolean };
  style: Record<string, string>;
  children: FakeElement[];
  rect: RectLike;
  appendChild: (child: FakeElement) => FakeElement;
  querySelector: (selector: string) => FakeElement | null;
  getBoundingClientRect: () => RectLike;
  cloneNode: (deep?: boolean) => FakeElement;
  setAttribute: (key: string, value: string) => void;
  computedStyle?: FakeStyle;
};

type FakeDocument = {
  body: FakeElement;
  documentElement: FakeElement;
  defaultView: { getComputedStyle: (el: FakeElement) => FakeStyle | null } | null;
  createElement: (tag: string) => FakeElement;
  getElementById: (id: string) => FakeElement | null;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
};

function createComputedStyle(overrides: Partial<Omit<FakeStyle, 'getPropertyValue'>> = {}): FakeStyle {
  const state = {
    display: 'block',
    direction: 'rtl',
    color: '#111',
    fontSize: '14',
    fontFamily: 'sans-serif',
    fontWeight: '400',
    fontStyle: 'normal',
    ...overrides,
  };
  return {
    ...state,
    getPropertyValue(key: string) {
      switch (key) {
        case 'display':
          return state.display || '';
        case 'direction':
          return state.direction || '';
        case 'color':
          return state.color || '';
        case 'font-size':
          return state.fontSize || '';
        case 'font-family':
          return state.fontFamily || '';
        case 'font-weight':
          return state.fontWeight || '';
        case 'font-style':
          return state.fontStyle || '';
        default:
          return '';
      }
    },
  };
}

function createElement(tag: string, rect: Partial<RectLike> = {}): FakeElement {
  const children: FakeElement[] = [];
  const queries = new Map<string, FakeElement | null>();
  const el: FakeElement = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    style: {},
    children,
    rect: { left: 0, top: 0, width: 1, height: 1, ...rect },
    innerHTML: '',
    outerHTML: `<${String(tag || 'div').toLowerCase()}></${String(tag || 'div').toLowerCase()}>`,
    appendChild(child: FakeElement) {
      children.push(child);
      child.ownerDocument = this.ownerDocument;
      return child;
    },
    querySelector(selector: string) {
      return queries.get(selector) || null;
    },
    getBoundingClientRect() {
      return this.rect;
    },
    cloneNode() {
      const cloned = createElement(tag, this.rect);
      cloned.textContent = this.textContent;
      cloned.innerText = this.innerText;
      cloned.dir = this.dir;
      cloned.ownerDocument = this.ownerDocument;
      cloned.computedStyle = this.computedStyle;
      return cloned;
    },
    setAttribute() {},
  };
  (el as FakeElement & { __setQuery: (selector: string, value: FakeElement | null) => void }).__setQuery = (
    selector: string,
    value: FakeElement | null
  ) => queries.set(selector, value);
  return el;
}

function setQuery(root: FakeElement, selector: string, value: FakeElement | null) {
  (root as FakeElement & { __setQuery?: (selector: string, value: FakeElement | null) => void }).__setQuery?.(
    selector,
    value
  );
}

function createNotesApp(options: {
  hidden?: boolean;
  notesEnabled?: boolean | null;
  boxes?: FakeElement[];
  markers?: FakeElement[];
}) {
  const viewer = createElement('div', { width: 120, height: 60 });
  viewer.id = 'viewer-container';
  viewer.classList = {
    contains(name: string) {
      return name === 'notes-hidden' ? !!options.hidden : false;
    },
  };

  const body = createElement('body');
  const html = createElement('html');
  const notesBoxes = options.boxes || [];
  const notesMarkers = options.markers || [];

  const doc: FakeDocument = {
    body,
    documentElement: html,
    defaultView: {
      getComputedStyle(el: FakeElement) {
        return el.computedStyle || createComputedStyle();
      },
    },
    createElement(tag: string) {
      const el = createElement(tag);
      el.ownerDocument = doc;
      return el;
    },
    getElementById(id: string) {
      return id === 'viewer-container' ? viewer : null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector: string) {
      if (selector === '.annotation-box') return notesBoxes;
      if (selector === '.annotation-marker') return notesMarkers;
      return [];
    },
  };

  viewer.ownerDocument = doc;
  body.ownerDocument = doc;
  html.ownerDocument = doc;
  for (const box of notesBoxes) box.ownerDocument = doc;
  for (const marker of notesMarkers) marker.ownerDocument = doc;

  const App: Record<string, unknown> = {
    deps: { browser: { document: doc } },
    store: {
      getState() {
        return {
          ui:
            typeof options.notesEnabled === 'boolean'
              ? { notesEnabled: options.notesEnabled }
              : Object.create(null),
        };
      },
    },
    services: Object.create(null),
  };

  return { App };
}

function createCanvasContext() {
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  return {
    fillTextCalls,
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage() {},
    measureText(text: string) {
      return { width: String(text || '').length * 6 };
    },
    fillText(text: string, x: number, y: number) {
      fillTextCalls.push({ text: String(text || ''), x, y });
    },
    set font(_value: string) {},
    set textBaseline(_value: string) {},
    set direction(_value: CanvasDirection) {},
    set textAlign(_value: CanvasTextAlign) {},
    set fillStyle(_value: string) {},
  } as unknown as CanvasRenderingContext2D & {
    fillTextCalls: Array<{ text: string; x: number; y: number }>;
  };
}

test('notes export visibility follows annotation presence and canonical notesEnabled hint semantics', () => {
  const box = createElement('div');
  const marker = createElement('div');

  const hiddenDisabled = createNotesApp({ hidden: true, notesEnabled: false, boxes: [box] });
  assert.equal(shouldIncludeNotesInExport(hiddenDisabled.App), false);

  const hiddenEnabled = createNotesApp({ hidden: true, notesEnabled: true, boxes: [box] });
  assert.equal(shouldIncludeNotesInExport(hiddenEnabled.App), true);

  const visibleByMarker = createNotesApp({ hidden: false, notesEnabled: null, markers: [marker] });
  assert.equal(shouldIncludeNotesInExport(visibleByMarker.App), true);

  const empty = createNotesApp({ hidden: false, notesEnabled: true, boxes: [], markers: [] });
  assert.equal(shouldIncludeNotesInExport(empty.App), false);
});

test('notes export render falls back to plain text when image rasterization fails and install exposes canonical service methods', async () => {
  const editor = createElement('div', { left: 10, top: 12, width: 40, height: 18 });
  editor.textContent = 'שלום note export';
  editor.innerText = 'שלום note export';
  editor.computedStyle = createComputedStyle({ direction: 'rtl' });

  const box = createElement('div', { left: 10, top: 12, width: 40, height: 18 });
  box.computedStyle = createComputedStyle({ display: 'block' });
  setQuery(box, '.editor', editor);

  const { App } = createNotesApp({ hidden: false, notesEnabled: true, boxes: [box] });
  installNotesExport(App);
  const api = getUiNotesExportServiceMaybe(App);
  assert.equal(typeof api?.shouldIncludeNotesInExport, 'function');
  assert.equal(typeof api?.renderAllNotesToCanvas, 'function');
  assert.equal(api?.shouldIncludeNotesInExport?.(), true);

  const ctx = createCanvasContext();
  const originalImage = (globalThis as typeof globalThis & { Image?: unknown }).Image;

  class FailingImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      this.onerror?.();
    }
  }

  (globalThis as typeof globalThis & { Image?: unknown }).Image = FailingImage;
  try {
    const result = await renderAllNotesToCanvas(App, ctx, 240, 120, 7, null);
    assert.equal(result, true);
    assert.equal(ctx.fillTextCalls.length > 0, true);
    assert.equal(
      ctx.fillTextCalls.some(call => /note|export/.test(call.text)),
      true
    );

    const viaService = await api?.renderAllNotesToCanvas?.(ctx, 240, 120);
    assert.equal(viaService, true);
    assert.equal(ctx.fillTextCalls.length >= 2, true);
  } finally {
    (globalThis as typeof globalThis & { Image?: unknown }).Image = originalImage;
  }
});
