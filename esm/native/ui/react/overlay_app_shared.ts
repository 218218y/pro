import { reportError } from '../../services/api.js';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

export type ModalState =
  | {
      open: false;
      mode: null;
      title: string;
      message: string;
      value: string;
    }
  | {
      open: true;
      mode: 'prompt' | 'confirm';
      title: string;
      message: string;
      value: string;
    };

export type UiFeedbackHost = {
  toast: (msg: unknown, kind?: unknown) => void;
  prompt: (title: string, defaultValue: string, cb?: ((v: unknown) => void) | null) => void;
  confirm: (title: string, message: string, onYes?: (() => void) | null, onNo?: (() => void) | null) => void;
};

export type AppUiFeedbackSlot = {
  services?: {
    uiFeedbackRuntime?: {
      reactHost?: UiFeedbackHost | null;
    } | null;
  } | null;
};

const overlayAppReportNonFatalSeen = new Map<string, number>();

function readOverlayReportArgs(args: ArrayLike<unknown>): {
  app: unknown | null;
  op: string;
  err: unknown;
  throttleMs: number;
} {
  if (args.length >= 3 && typeof args[0] !== 'string' && typeof args[1] === 'string') {
    return {
      app: args[0] && typeof args[0] === 'object' ? (args[0] as AppUiFeedbackSlot) : null,
      op: String(args[1] || 'unknown'),
      err: args[2],
      throttleMs: typeof args[3] === 'number' && Number.isFinite(args[3]) ? Math.max(0, args[3]) : 4000,
    };
  }

  return {
    app: null,
    op: String(args[0] || 'unknown'),
    err: args[1],
    throttleMs: typeof args[2] === 'number' && Number.isFinite(args[2]) ? Math.max(0, args[2]) : 4000,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

export function readToastKind(value: unknown): ToastKind {
  return value === 'error' || value === 'info' || value === 'success' ? value : 'info';
}

export function readInputValue(event: unknown): string {
  if (!isRecord(event)) return '';
  const target = isRecord(event.target) ? event.target : null;
  return target && typeof target.value === 'string' ? target.value : '';
}

export function hasClosestElement(
  value: unknown
): value is HTMLElement & { closest: (selector: string) => Element | null } {
  return !!value && typeof value === 'object' && typeof Reflect.get(value, 'closest') === 'function';
}

type OverlayAppReportNonFatalArgs =
  | [op: string, err: unknown, throttleMs?: number]
  | [app: unknown | null | undefined, op: string, err: unknown, throttleMs?: number];

export function reportOverlayAppNonFatal(...args: OverlayAppReportNonFatalArgs): void {
  const { app, op, err, throttleMs } = readOverlayReportArgs(args);
  const now = Date.now();
  let msg = 'unknown';
  if (typeof err === 'string') msg = err;
  else if (typeof err === 'number' || typeof err === 'boolean') msg = String(err);
  else {
    const e = isRecord(err) ? err : null;
    if (typeof e?.stack === 'string' && e.stack) msg = e.stack.split('\n')[0] || e.stack;
    else if (typeof e?.message === 'string' && e.message) msg = e.message;
  }
  const key = `${op}::${msg}`;
  const prev = overlayAppReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  overlayAppReportNonFatalSeen.set(key, now);
  if (overlayAppReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [seenKey, ts] of overlayAppReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) overlayAppReportNonFatalSeen.delete(seenKey);
    }
  }
  if (app) {
    reportError(
      app,
      err,
      { where: 'native/ui/react/overlay_app', op, fatal: false },
      { consoleFallback: false }
    );
    return;
  }
  try {
    console.error(`[WardrobePro][overlay_app] ${op}`, err);
  } catch {
    // ignore no-app console failures
  }
}

export function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
  return !!value && (typeof value === 'object' || typeof value === 'function') && 'then' in value;
}

export function getComposedPathSafe(event: Event): EventTarget[] | null {
  try {
    const composedPath = Reflect.get(event, 'composedPath');
    return typeof composedPath === 'function' ? Reflect.apply(composedPath, event, []) : null;
  } catch {
    return null;
  }
}
