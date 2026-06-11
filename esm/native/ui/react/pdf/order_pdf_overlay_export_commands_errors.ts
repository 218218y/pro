import { normalizeUnknownError } from '../../../services/api.js';
import type {
  ExportImagePdfActionResult,
  ExportInteractiveActionResult,
  LoadPdfActionResult,
} from './order_pdf_overlay_contracts.js';
import type { GmailCommandResult } from './order_pdf_overlay_export_commands_types.js';

function readErrorDetail(error: unknown): string {
  return normalizeUnknownError(error).message.trim();
}

export function buildLoadPdfError(error: unknown): Extract<LoadPdfActionResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail
    ? { ok: false, kind: 'load-pdf', reason: 'error', detail }
    : { ok: false, kind: 'load-pdf', reason: 'error' };
}

export function buildExportInteractiveError(
  error: unknown
): Extract<ExportInteractiveActionResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail
    ? { ok: false, kind: 'export-interactive', reason: 'error', detail }
    : { ok: false, kind: 'export-interactive', reason: 'error' };
}

export function buildExportImagePdfError(error: unknown): Extract<ExportImagePdfActionResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail
    ? { ok: false, kind: 'export-image-pdf', reason: 'error', detail }
    : { ok: false, kind: 'export-image-pdf', reason: 'error' };
}

export function buildGmailError(
  kind: GmailCommandResult['kind'],
  error: unknown
): Extract<GmailCommandResult, { ok: false }> {
  const detail = readErrorDetail(error);
  return detail ? { ok: false, kind, reason: 'error', detail } : { ok: false, kind, reason: 'error' };
}
