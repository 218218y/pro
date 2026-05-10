import type { UnknownRecord } from '../../../types/index.js';

import { getDocumentMaybe, getNavigatorMaybe } from './browser_env.js';
import { buildErrorResult as buildNormalizedErrorResult } from './error_normalization.js';

export type BrowserClipboardResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'error'; message?: string };

type ClipboardTextWriterLike = {
  writeText?: (text: string) => Promise<unknown> | unknown;
};

type ClipboardItemsWriterLike = {
  write?: (items: ClipboardItems) => Promise<unknown> | unknown;
};

type ClipboardSurfaceLike = ClipboardTextWriterLike & ClipboardItemsWriterLike;

type ClipboardDocumentLike = Pick<Document, 'createElement' | 'execCommand'> & {
  body?: Pick<HTMLElement, 'appendChild'> | null;
};
function asRecord(value: unknown): UnknownRecord | null {
  return value && (typeof value === 'object' || typeof value === 'function') ? Object(value) : null;
}

function buildUnavailableResult(message?: string): BrowserClipboardResult {
  const detail = typeof message === 'string' ? message.trim() : '';
  return detail
    ? { ok: false, reason: 'unavailable', message: detail }
    : { ok: false, reason: 'unavailable' };
}

function buildErrorResult(error: unknown, defaultMessage: string): BrowserClipboardResult {
  return buildNormalizedErrorResult('error', error, defaultMessage);
}

function isClipboardDocumentLike(value: unknown): value is ClipboardDocumentLike {
  const rec = asRecord(value);
  return !!rec && typeof rec.createElement === 'function' && typeof rec.execCommand === 'function';
}

function isClipboardSurfaceLike(value: unknown): value is ClipboardSurfaceLike {
  const rec = asRecord(value);
  return !!rec && (typeof rec.writeText === 'function' || typeof rec.write === 'function');
}

function resolveDocument(appOrCtx: unknown): ClipboardDocumentLike | null {
  const rec = asRecord(appOrCtx);
  const ctxDoc = rec && isClipboardDocumentLike(rec.docMaybe) ? rec.docMaybe : null;
  return ctxDoc || getDocumentMaybe(appOrCtx);
}

function resolveClipboard(appOrCtx: unknown): ClipboardSurfaceLike | null {
  const rec = asRecord(appOrCtx);
  const ctxClipboard = rec ? rec.clipboardMaybe : null;
  if (isClipboardSurfaceLike(ctxClipboard)) return ctxClipboard;
  const nav = getNavigatorMaybe(appOrCtx);
  const clipboard = nav?.clipboard ?? null;
  return isClipboardSurfaceLike(clipboard) ? clipboard : null;
}

function execCommandCopyText(doc: ClipboardDocumentLike, text: string): BrowserClipboardResult {
  if (!doc.body || typeof doc.createElement !== 'function' || typeof doc.execCommand !== 'function') {
    return buildUnavailableResult('browser clipboard text unavailable');
  }

  const ta = doc.createElement('textarea');
  try {
    ta.value = text;
    ta.setAttribute?.('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    doc.body.appendChild?.(ta);
    ta.select?.();
    const copied = doc.execCommand('copy');
    return copied ? { ok: true } : buildUnavailableResult('browser clipboard text unavailable');
  } catch (error) {
    return buildErrorResult(error, 'browser clipboard text copy failed');
  } finally {
    try {
      ta.remove?.();
    } catch {
      // ignore cleanup failure in clipboard fallback
    }
  }
}

export async function writeClipboardTextResultViaBrowser(
  appOrCtx: unknown,
  text: string,
  opts?: { allowExecCommand?: boolean } | null
): Promise<BrowserClipboardResult> {
  const clipboard = resolveClipboard(appOrCtx);
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await Promise.resolve(clipboard.writeText(String(text || '')));
      return { ok: true };
    } catch (error) {
      return buildErrorResult(error, 'browser clipboard text write failed');
    }
  }

  const allowExecCommand = opts?.allowExecCommand !== false;
  if (!allowExecCommand) return buildUnavailableResult('browser clipboard text unavailable');

  const doc = resolveDocument(appOrCtx);
  if (!doc) return buildUnavailableResult('browser clipboard text unavailable');
  return execCommandCopyText(doc, String(text || ''));
}

export async function writeClipboardItemsResultViaBrowser(
  appOrCtx: unknown,
  items: ClipboardItems
): Promise<BrowserClipboardResult> {
  const clipboard = resolveClipboard(appOrCtx);
  if (!clipboard || typeof clipboard.write !== 'function') {
    return buildUnavailableResult('browser clipboard items unavailable');
  }

  try {
    await Promise.resolve(clipboard.write(items));
    return { ok: true };
  } catch (error) {
    return buildErrorResult(error, 'browser clipboard items write failed');
  }
}
