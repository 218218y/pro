import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldIncludeNotesInExport } from '../esm/native/ui/notes_export_visibility.ts';
import { renderAllNotesToCanvas } from '../esm/native/ui/notes_export_render_runtime.ts';
import { drawEditorAsImageAxisAligned } from '../esm/native/ui/notes_export_render_draw.ts';
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
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  lineHeight?: string;
  textAlign?: string;
  whiteSpace?: string;
  overflowWrap?: string;
  wordWrap?: string;
  wordBreak?: string;
  boxSizing?: string;
  backgroundColor?: string;
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
  style: Record<string, unknown> & {
    setProperty?: (key: string, value: string) => void;
  };
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
  defaultView: {
    getComputedStyle: (el: FakeElement) => FakeStyle | null;
  } | null;
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
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    lineHeight: 'normal',
    textAlign: 'right',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordWrap: 'break-word',
    wordBreak: 'normal',
    boxSizing: 'border-box',
    backgroundColor: 'transparent',
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
        case 'padding-top':
          return state.paddingTop || '';
        case 'padding-right':
          return state.paddingRight || '';
        case 'padding-bottom':
          return state.paddingBottom || '';
        case 'padding-left':
          return state.paddingLeft || '';
        case 'line-height':
          return state.lineHeight || '';
        case 'text-align':
          return state.textAlign || '';
        case 'white-space':
          return state.whiteSpace || '';
        case 'overflow-wrap':
          return state.overflowWrap || '';
        case 'word-wrap':
          return state.wordWrap || '';
        case 'word-break':
          return state.wordBreak || '';
        case 'box-sizing':
          return state.boxSizing || '';
        case 'background-color':
          return state.backgroundColor || '';
        default:
          return '';
      }
    },
  };
}

function createElement(tag: string, rect: Partial<RectLike> = {}): FakeElement {
  const children: FakeElement[] = [];
  const queries = new Map<string, FakeElement | null>();
  const style: FakeElement['style'] = {};
  style.setProperty = (key: string, value: string) => {
    style[key] = value;
  };
  const serializeStyle = () =>
    Object.entries(style)
      .filter(([key, value]) => key !== 'setProperty' && typeof value === 'string' && value)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, ch => `-${ch.toLowerCase()}`)}: ${value}`)
      .join('; ');
  const serializeOuter = () => {
    const name = String(tag || 'div').toLowerCase();
    const styleAttr = serializeStyle();
    const html =
      children.map(child => child.outerHTML || '').join('') || el.innerHTML || el.textContent || '';
    return `<${name}${styleAttr ? ` style="${styleAttr}"` : ''}>${html}</${name}>`;
  };
  const el: FakeElement = {
    nodeType: 1,
    tagName: String(tag || 'div').toUpperCase(),
    style,
    children,
    rect: { left: 0, top: 0, width: 1, height: 1, ...rect },
    innerHTML: '',
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
    cloneNode(deep = false) {
      const cloned = createElement(tag, this.rect);
      cloned.textContent = this.textContent;
      cloned.innerText = this.innerText;
      cloned.innerHTML = this.innerHTML;
      cloned.dir = this.dir;
      cloned.ownerDocument = this.ownerDocument;
      cloned.computedStyle = this.computedStyle;
      if (deep) {
        for (const child of children) cloned.appendChild(child.cloneNode(true));
      }
      return cloned;
    },
    setAttribute() {},
  };
  Object.defineProperty(el, 'outerHTML', {
    get: serializeOuter,
    configurable: true,
  });
  (
    el as FakeElement & {
      __setQuery: (selector: string, value: FakeElement | null) => void;
    }
  ).__setQuery = (selector: string, value: FakeElement | null) => queries.set(selector, value);
  return el;
}

function setQuery(root: FakeElement, selector: string, value: FakeElement | null) {
  (
    root as FakeElement & {
      __setQuery?: (selector: string, value: FakeElement | null) => void;
    }
  ).__setQuery?.(selector, value);
}

function createNotesApp(options: {
  hidden?: boolean;
  notesEnabled?: boolean | null;
  viewerRect?: Partial<RectLike>;
  boxes?: FakeElement[];
  markers?: FakeElement[];
}) {
  const viewer = createElement('div', { width: 120, height: 60, ...options.viewerRect });
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

  const hiddenDisabled = createNotesApp({
    hidden: true,
    notesEnabled: false,
    boxes: [box],
  });
  assert.equal(shouldIncludeNotesInExport(hiddenDisabled.App), false);

  const hiddenEnabled = createNotesApp({
    hidden: true,
    notesEnabled: true,
    boxes: [box],
  });
  assert.equal(shouldIncludeNotesInExport(hiddenEnabled.App), true);

  const visibleByMarker = createNotesApp({
    hidden: false,
    notesEnabled: null,
    markers: [marker],
  });
  assert.equal(shouldIncludeNotesInExport(visibleByMarker.App), true);

  const empty = createNotesApp({
    hidden: false,
    notesEnabled: true,
    boxes: [],
    markers: [],
  });
  assert.equal(shouldIncludeNotesInExport(empty.App), false);
});

test('notes export render falls back to plain text when image rasterization fails and install exposes canonical service methods', async () => {
  const editor = createElement('div', {
    left: 10,
    top: 12,
    width: 40,
    height: 18,
  });
  editor.textContent = 'שלום note export';
  editor.innerText = 'שלום note export';
  editor.computedStyle = createComputedStyle({ direction: 'rtl' });

  const box = createElement('div', {
    left: 10,
    top: 12,
    width: 40,
    height: 18,
  });
  box.computedStyle = createComputedStyle({ display: 'block' });
  setQuery(box, '.editor', editor);

  const { App } = createNotesApp({
    hidden: false,
    notesEnabled: true,
    boxes: [box],
  });
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

test('notes export plain-text fallback uses the live editor padding and line metrics', async () => {
  const editor = createElement('div', {
    left: 10,
    top: 12,
    width: 40,
    height: 30,
  });
  editor.textContent = 'שלום קצר';
  editor.innerText = 'שלום קצר';
  editor.computedStyle = createComputedStyle({
    direction: 'rtl',
    fontSize: '10px',
    paddingTop: '3px',
    paddingRight: '4px',
    paddingBottom: '2px',
    paddingLeft: '5px',
    lineHeight: '12px',
  });

  const box = createElement('div', {
    left: 10,
    top: 12,
    width: 40,
    height: 30,
  });
  box.computedStyle = createComputedStyle({ display: 'block' });
  setQuery(box, '.editor', editor);

  const { App } = createNotesApp({
    hidden: false,
    notesEnabled: true,
    boxes: [box],
  });
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
    assert.equal(ctx.fillTextCalls.length, 1);
    assert.equal(ctx.fillTextCalls[0]?.x, 92);
    assert.equal(ctx.fillTextCalls[0]?.y, 37);
  } finally {
    (globalThis as typeof globalThis & { Image?: unknown }).Image = originalImage;
  }
});

test('notes export maps exact-copy coordinates from the renderer canvas source rect', async () => {
  const editor = createElement('div', {
    left: 37,
    top: 53,
    width: 40,
    height: 18,
  });
  editor.textContent = 'note';
  editor.innerText = 'note';
  editor.computedStyle = createComputedStyle({
    direction: 'ltr',
    textAlign: 'left',
    fontSize: '10px',
    paddingTop: '0px',
    paddingRight: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    lineHeight: '12px',
  });

  const box = createElement('div', {
    left: 37,
    top: 53,
    width: 40,
    height: 18,
  });
  box.computedStyle = createComputedStyle({ display: 'block' });
  setQuery(box, '.editor', editor);

  const { App } = createNotesApp({
    hidden: false,
    notesEnabled: true,
    viewerRect: { left: 20, top: 30, width: 120, height: 60 },
    boxes: [box],
  });
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
    const result = await renderAllNotesToCanvas(App, ctx, 200, 100, 5, {
      sx: 1,
      sy: 1,
      dx: 0,
      dy: 0,
      sourceRect: { left: 30, top: 50, width: 100, height: 50 },
    });
    assert.equal(result, true);
    assert.equal(ctx.fillTextCalls.length, 1);
    assert.equal(ctx.fillTextCalls[0]?.x, 14);
    assert.equal(ctx.fillTextCalls[0]?.y, 11);
  } finally {
    (globalThis as typeof globalThis & { Image?: unknown }).Image = originalImage;
  }
});

test('notes export image path serializes the computed editor box style used by the live note', async () => {
  const editor = createElement('div', {
    left: 0,
    top: 0,
    width: 120,
    height: 50,
  });
  editor.innerHTML = 'טקסט הערה ארוך';
  editor.textContent = 'טקסט הערה ארוך';
  editor.innerText = 'טקסט הערה ארוך';
  editor.computedStyle = createComputedStyle({
    direction: 'rtl',
    fontSize: '18px',
    fontFamily: 'Heebo, sans-serif',
    paddingTop: '8px',
    paddingRight: '8px',
    paddingBottom: '8px',
    paddingLeft: '8px',
    lineHeight: 'normal',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    boxSizing: 'border-box',
  });

  const doc = createNotesApp({ hidden: false, notesEnabled: true, boxes: [] }).App.deps as {
    browser: { document: FakeDocument };
  };
  const ctx = createCanvasContext();
  const originalImage = (globalThis as typeof globalThis & { Image?: unknown }).Image;
  let decodedSvg = '';

  class CapturingImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      decodedSvg = decodeURIComponent(String(value).replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
      this.onload?.();
    }
  }

  (globalThis as typeof globalThis & { Image?: unknown }).Image = CapturingImage;
  try {
    const ok = await drawEditorAsImageAxisAligned({
      doc: doc.browser.document as unknown as Document,
      ctx,
      editor: editor as unknown as HTMLElement,
      dstLeftCss: 0,
      dstTopCss: 0,
      dstWCss: 120,
      dstHCss: 50,
      srcWCss: 120,
      srcHCss: 50,
      scaleX: 1,
      scaleY: 1,
      titleOffset: 0,
    });

    assert.equal(ok, true);
    assert.match(decodedSvg, /padding-top:\s*8px/);
    assert.match(decodedSvg, /padding-right:\s*8px/);
    assert.match(decodedSvg, /white-space:\s*pre-wrap/);
    assert.match(decodedSvg, /box-sizing:\s*border-box/);
  } finally {
    (globalThis as typeof globalThis & { Image?: unknown }).Image = originalImage;
  }
});

test('notes export image path serializes computed styles for nested editor children', async () => {
  const editor = createElement('div', {
    left: 0,
    top: 0,
    width: 140,
    height: 60,
  });
  editor.computedStyle = createComputedStyle({
    direction: 'rtl',
    fontSize: '18px',
    fontFamily: 'Heebo, sans-serif',
    paddingTop: '8px',
    paddingRight: '8px',
    paddingBottom: '8px',
    paddingLeft: '8px',
    lineHeight: '22px',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    boxSizing: 'border-box',
  });

  const child = createElement('span');
  child.textContent = 'טקסט פנימי';
  child.innerText = 'טקסט פנימי';
  child.computedStyle = createComputedStyle({
    display: 'inline',
    color: 'rgb(10, 20, 30)',
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: '24px',
    whiteSpace: 'nowrap',
  });
  editor.appendChild(child);

  const doc = createNotesApp({ hidden: false, notesEnabled: true, boxes: [] }).App.deps as {
    browser: { document: FakeDocument };
  };
  const ctx = createCanvasContext();
  const originalImage = (globalThis as typeof globalThis & { Image?: unknown }).Image;
  let decodedSvg = '';

  class CapturingImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(value: string) {
      decodedSvg = decodeURIComponent(String(value).replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
      this.onload?.();
    }
  }

  (globalThis as typeof globalThis & { Image?: unknown }).Image = CapturingImage;
  try {
    const ok = await drawEditorAsImageAxisAligned({
      doc: doc.browser.document as unknown as Document,
      ctx,
      editor: editor as unknown as HTMLElement,
      dstLeftCss: 0,
      dstTopCss: 0,
      dstWCss: 140,
      dstHCss: 60,
      srcWCss: 140,
      srcHCss: 60,
      scaleX: 1,
      scaleY: 1,
      titleOffset: 0,
    });

    assert.equal(ok, true);
    assert.match(decodedSvg, /<span[^>]*style="[^"]*display:\s*inline/);
    assert.match(decodedSvg, /<span[^>]*style="[^"]*color:\s*rgb\(10, 20, 30\)/);
    assert.match(decodedSvg, /<span[^>]*style="[^"]*font-size:\s*20px/);
    assert.match(decodedSvg, /<span[^>]*style="[^"]*font-weight:\s*700/);
    assert.match(decodedSvg, /<span[^>]*style="[^"]*white-space:\s*nowrap/);
  } finally {
    (globalThis as typeof globalThis & { Image?: unknown }).Image = originalImage;
  }
});
