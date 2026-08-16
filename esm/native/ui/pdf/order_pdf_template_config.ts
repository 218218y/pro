import { readRuntimeConfigValueFromApp } from '../../services/api.js';

const DEFAULT_ORDER_PDF_TEMPLATE_URLS = ['/order_template.pdf', './order_template.pdf', 'order_template.pdf'];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asCleanUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const s = value.trim();
  if (!s) return '';
  // Template URLs are app/site assets only. Block script/data URLs defensively.
  if (/^(javascript|data):/i.test(s)) return '';
  return s;
}

function uniqUrls(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const url = asCleanUrl(value);
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}

export function readOrderPdfTemplateUrl(App: unknown): string {
  try {
    const raw = readRuntimeConfigValueFromApp(App, 'orderPdf');
    const rec = isRecord(raw) ? raw : null;
    return asCleanUrl(rec?.templateUrl);
  } catch {
    return '';
  }
}

export function resolveOrderPdfTemplateUrls(App: unknown): string[] {
  return uniqUrls([readOrderPdfTemplateUrl(App), ...DEFAULT_ORDER_PDF_TEMPLATE_URLS]);
}
