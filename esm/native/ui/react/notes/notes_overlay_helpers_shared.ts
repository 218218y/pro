export type Rect = { left: number; top: number; width: number; height: number };

export type Interaction =
  | { kind: 'create'; startX: number; startY: number; pointerId: number }
  | {
      kind: 'move';
      index: number;
      startX: number;
      startY: number;
      startLeft: number;
      startTop: number;
      pointerId: number;
    }
  | {
      kind: 'resize';
      index: number;
      dir: string;
      startX: number;
      startY: number;
      startLeft: number;
      startTop: number;
      startWidth: number;
      startHeight: number;
      pointerId: number;
    };

const __notesOverlayReportNonFatalSeen = new Map<string, number>();

export function notesOverlayReportNonFatal(op: string, err: unknown, dedupeMs = 4000): void {
  const now = Date.now();
  const e = err instanceof Error ? err : new Error(String(err));
  const key = `${op}|${e.name}|${e.message}`;
  const last = __notesOverlayReportNonFatalSeen.get(key) ?? 0;
  if (dedupeMs > 0 && now - last < dedupeMs) return;
  __notesOverlayReportNonFatalSeen.set(key, now);
  console.error(`[WardrobePro][NotesOverlay] ${op}`, err);
}

export const MIN_CREATE = 30;
export const MIN_SIZE = 50;

export function uiFontSizeToLegacy(ui: string): string {
  const n = parseInt(String(ui || '').trim(), 10);
  if (!Number.isFinite(n)) return '4';
  const clamped = Math.max(1, Math.min(5, n));
  return String(clamped + 1);
}

export function legacyFontSizeToUi(legacy: string): string {
  const n = parseInt(String(legacy || '').trim(), 10);
  if (!Number.isFinite(n)) return '3';
  const clamped = Math.max(2, Math.min(6, n));
  return String(clamped - 1);
}

export function px(n: number): string {
  return `${Math.round(n)}px`;
}

export function parsePx(v: unknown, fallback: number): number {
  if (typeof v !== 'string') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isEmptyHtml(html: string): boolean {
  const t = String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return t.length === 0;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
