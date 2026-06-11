import { createDetachedHtmlRoot, readInnerHtml } from './dom_helpers.js';

export type HtmlSanitizePolicy = 'notes-rich' | 'order-pdf-rich' | 'overlay-help';

const COMMENT_NODE = 8;
const ELEMENT_NODE = 1;
const VOID_TAGS = new Set(['BR']);

const SHARED_INLINE_TAGS = ['BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'SPAN', 'DIV', 'P'];
const ORDER_PDF_ALLOWED_TAGS = new Set([...SHARED_INLINE_TAGS, 'FONT', 'UL', 'OL', 'LI']);
const NOTES_ALLOWED_TAGS = new Set(['DIV', 'SPAN', 'BR', 'B', 'STRONG', 'I', 'EM', 'FONT']);
const OVERLAY_ALLOWED_TAGS = new Set([
  'P',
  'BR',
  'B',
  'STRONG',
  'I',
  'EM',
  'CODE',
  'PRE',
  'UL',
  'OL',
  'LI',
  'A',
]);

const POLICY_ALLOWED_TAGS: Record<HtmlSanitizePolicy, Set<string>> = {
  'notes-rich': NOTES_ALLOWED_TAGS,
  'order-pdf-rich': ORDER_PDF_ALLOWED_TAGS,
  'overlay-help': OVERLAY_ALLOWED_TAGS,
};

const DANGEROUS_DROP_CONTENT_TAGS = new Set(['IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'META', 'LINK']);
const DANGEROUS_UNWRAP_TAGS = new Set(['SCRIPT', 'STYLE']);

function isElementNode(node: Node): node is Element {
  return !!node && node.nodeType === ELEMENT_NODE && typeof Reflect.get(node, 'tagName') === 'string';
}

function lower(value: unknown): string {
  return String(value || '').toLowerCase();
}

function trim(value: unknown): string {
  return String(value || '').trim();
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isAllowedColor(value: string): boolean {
  return /^(#[0-9a-f]{3,8}|[a-z]+|rgb[a]?\([^\n\r]+\)|hsl[a]?\([^\n\r]+\))$/i.test(value);
}

function isAllowedAnchorHref(value: string): boolean {
  return /^(https?:|mailto:|tel:|\/|#|\.\.?\/)/i.test(value);
}

function readSanitizedAttrValue(
  policy: HtmlSanitizePolicy,
  tag: string,
  name: string,
  rawValue: string
): string | null {
  const value = trim(rawValue);
  const attr = lower(name);
  if (!attr || attr.startsWith('on') || attr === 'style') return null;

  if (policy === 'notes-rich') {
    if (tag !== 'FONT') return null;
    if (attr === 'color') return isAllowedColor(value) ? value : null;
    if (attr === 'size') return /^[1-7]$/.test(value) ? value : null;
    return null;
  }

  if (policy === 'order-pdf-rich') {
    if (tag === 'FONT') {
      if (attr === 'color') return isAllowedColor(value) ? value : null;
      if (attr === 'size') return /^[1-7]$/.test(value) ? value : null;
      return null;
    }
    if (tag === 'SPAN' && attr === 'data-wp-auto') return value === 'start' || value === 'end' ? value : null;
    if (tag === 'SPAN' && attr === 'contenteditable') return value === 'false' ? 'false' : null;
    return null;
  }

  if (policy === 'overlay-help') {
    if (tag === 'A' && attr === 'href') return isAllowedAnchorHref(value) ? value : null;
    if (tag === 'A' && attr === 'target') return value === '_blank' || value === '_self' ? value : null;
    if (tag === 'A' && attr === 'rel') return value ? 'noopener noreferrer' : null;
    return null;
  }

  return null;
}

function removeNode(node: Node): void {
  try {
    node.parentNode?.removeChild(node);
  } catch {}
}

function unwrapNode(el: Element): void {
  try {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  } catch {
    removeNode(el);
  }
}

function sanitizeElementAttrs(policy: HtmlSanitizePolicy, el: Element, tag: string): void {
  try {
    const attrs = Array.from(el.attributes || []);
    for (const attr of attrs) {
      const sanitized = readSanitizedAttrValue(policy, tag, attr.name, attr.value);
      if (sanitized == null) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.value !== sanitized) el.setAttribute(attr.name, sanitized);
    }
  } catch {}
}

function sanitizeDomTree(policy: HtmlSanitizePolicy, root: Element): string {
  const allowedTags = POLICY_ALLOWED_TAGS[policy];
  const walk = (node: Node): void => {
    if (node.nodeType === COMMENT_NODE) {
      removeNode(node);
      return;
    }
    if (!isElementNode(node)) return;
    const tag = String(node.tagName || '').toUpperCase();
    if (DANGEROUS_DROP_CONTENT_TAGS.has(tag)) {
      removeNode(node);
      return;
    }
    if (DANGEROUS_UNWRAP_TAGS.has(tag)) {
      unwrapNode(node);
      return;
    }
    if (!allowedTags.has(tag)) {
      unwrapNode(node);
      return;
    }
    sanitizeElementAttrs(policy, node, tag);
    try {
      const children = Array.from(node.childNodes || []);
      for (const child of children) walk(child);
    } catch {}
  };
  try {
    const children = Array.from(root.childNodes || []);
    for (const child of children) walk(child);
  } catch {}
  return readInnerHtml(root);
}

function sanitizeTagMarkupFallback(
  policy: HtmlSanitizePolicy,
  tagName: string,
  attrsChunk: string,
  closing: boolean
): string {
  const tag = String(tagName || '').toUpperCase();
  const allowedTags = POLICY_ALLOWED_TAGS[policy];
  if (!allowedTags.has(tag)) return '';
  if (closing) return `</${tag.toLowerCase()}>`;
  const attrRe = /([^\s"'=<>`\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const kept: string[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = attrRe.exec(attrsChunk))) {
    const rawName = String(match[1] || '');
    const rawValue = String(match[2] ?? match[3] ?? match[4] ?? '');
    const sanitized = readSanitizedAttrValue(policy, tag, rawName, rawValue);
    if (sanitized == null) continue;
    kept.push(`${rawName.toLowerCase()}="${escapeAttribute(sanitized)}"`);
  }
  const attrs = kept.length ? ` ${kept.join(' ')}` : '';
  return `<${tag.toLowerCase()}${attrs}${VOID_TAGS.has(tag) ? '>' : '>'}`;
}

function sanitizeHtmlFallback(policy: HtmlSanitizePolicy, html: string): string {
  const source = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:iframe|object|embed|template|meta|link)\b[^>]*>/gi, '')
    .replace(/<\/?(?:script|style)\b[^>]*>/gi, '');
  const tagRe = /<(\/)?([a-zA-Z0-9:-]+)([^>]*)>/g;
  let out = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  while ((match = tagRe.exec(source))) {
    out += source.slice(lastIndex, match.index);
    out += sanitizeTagMarkupFallback(policy, match[2] || '', match[3] || '', !!match[1]);
    lastIndex = match.index + match[0].length;
  }
  out += source.slice(lastIndex);
  return out;
}

export function sanitizeHtmlByPolicy(
  doc: Document | null | undefined,
  html: string,
  policy: HtmlSanitizePolicy
): string {
  const raw = String(html || '');
  if (!raw) return '';
  const root = createDetachedHtmlRoot(doc, raw);
  if (root) return sanitizeDomTree(policy, root);
  return sanitizeHtmlFallback(policy, raw);
}

export function setSanitizedElementHtmlIfChanged(args: {
  el: Element | null | undefined;
  html: string;
  doc?: Document | null | undefined;
  policy: HtmlSanitizePolicy;
}): { changed: boolean; html: string } {
  const nextHtml = sanitizeHtmlByPolicy(args.doc, args.html, args.policy);
  const el = args.el;
  if (!el) return { changed: false, html: nextHtml };
  const prevHtml = readInnerHtml(el);
  if (prevHtml === nextHtml) return { changed: false, html: nextHtml };
  try {
    (el as Element & { innerHTML?: unknown }).innerHTML = nextHtml;
    return { changed: true, html: nextHtml };
  } catch {
    return { changed: false, html: nextHtml };
  }
}
