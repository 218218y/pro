import { createDetachedHtmlRoot, readInnerHtml } from '../../dom_helpers.js';
import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function isTextNode(node: Node): node is Text {
  return node.nodeType === TEXT_NODE;
}

function isHtmlElement(node: Node): node is HTMLElement {
  return node.nodeType === ELEMENT_NODE && typeof Reflect.get(node, 'tagName') === 'string';
}

function readHtmlElement(node: Node): HTMLElement | null {
  return isHtmlElement(node) ? node : null;
}

export function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

export function makeEmptyDraft(): OrderPdfDraft {
  return {
    projectName: '',
    orderNumber: '',
    orderDate: '',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: '',
    manualDetails: '',
    manualDetailsHtml: '',
    detailsFull: true,
    detailsTouched: false,
    detailsSeed: '',
    manualEnabled: false,
    notes: '',
    notesHtml: '',
    includeRenderSketch: true,
    includeOpenClosed: true,
    sketchAnnotations: undefined,
  };
}

export function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeNewlines(s: string): string {
  return (s || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2028\u2029\u0085]/g, '\n');
}

export function textToHtml(s: string): string {
  const t = normalizeNewlines(s || '');
  return escapeHtml(t).replace(/\n/g, '<br>');
}

export function normalizeForCompare(s: string): string {
  return normalizeNewlines(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function decodeBasicHtmlEntities(value: string): string {
  return (value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function htmlToTextPreserveNewlines(doc: Document | null, html: string): string {
  const h = String(html || '');
  if (!h) return '';

  if (!doc) {
    const stripped = decodeBasicHtmlEntities(
      h
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/\s*(div|p|li|tr|table|ul|ol)\s*>/gi, '\n')
        .replace(/<[^>]*>/g, '')
    );
    return normalizeNewlines(stripped).replace(/\u00a0/g, ' ');
  }

  let root: HTMLDivElement | null = null;
  try {
    root = createDetachedHtmlRoot(doc, h);
  } catch {
    return normalizeNewlines(decodeBasicHtmlEntities(h.replace(/<[^>]*>/g, ''))).replace(/\u00a0/g, ' ');
  }
  if (!root) return '';

  const BLOCK = new Set(['DIV', 'P', 'LI', 'TR', 'TD', 'TH', 'UL', 'OL', 'TABLE']);
  let out = '';

  const walk = (node: Node) => {
    if (isTextNode(node)) {
      out += node.data || '';
      return;
    }

    const el = readHtmlElement(node);
    if (!el) return;
    const tag = (el.tagName || '').toUpperCase();

    if (tag === 'BR') {
      out += '\n';
      return;
    }

    if (tag === 'SPAN' && el.getAttribute && el.getAttribute('data-wp-auto')) {
      const kids = Array.from(el.childNodes || []);
      for (const k of kids) walk(k);
      return;
    }

    const isBlock = BLOCK.has(tag);
    const kids = Array.from(el.childNodes || []);
    for (const k of kids) walk(k);
    if (isBlock) out += '\n';
  };

  for (const n of Array.from(root.childNodes || [])) walk(n);

  let t = out.replace(/\u00a0/g, ' ');
  t = normalizeNewlines(t);
  t = t
    .split('\n')
    .map(l => l.replace(/\s+$/g, ''))
    .join('\n');

  if (t.endsWith('\n') && !t.endsWith('\n\n')) t = t.slice(0, -1);
  return t;
}

export function richEditorToText(el: HTMLElement | null): string {
  if (!el) return '';
  try {
    const innerTextRaw =
      typeof el.innerText === 'string'
        ? String(el.innerText)
        : typeof el.textContent === 'string'
          ? String(el.textContent)
          : '';

    const doc =
      el.ownerDocument && typeof el.ownerDocument.createElement === 'function' ? el.ownerDocument : null;

    const htmlRaw = readInnerHtml(el);
    const htmlTextRaw = htmlRaw ? htmlToTextPreserveNewlines(doc, htmlRaw) : '';

    const innerText = normalizeNewlines(innerTextRaw).replace(/\u00a0/g, ' ');
    const htmlText = normalizeNewlines(htmlTextRaw).replace(/\u00a0/g, ' ');

    const countLines = (s: string) => {
      const t = (s || '').replace(/\n+$/g, '');
      if (!t) return 0;
      return t.split('\n').length;
    };

    const nInner = countLines(innerText);
    const nHtml = countLines(htmlText);

    let out = innerText;
    if (nHtml >= nInner + 1 && htmlText.trim().length) out = htmlText;
    else if (!out.trim().length && htmlText.trim().length) out = htmlText;

    if (out.endsWith('\n') && !out.endsWith('\n\n')) out = out.slice(0, -1);
    return out;
  } catch {
    return '';
  }
}
