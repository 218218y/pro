import { Component } from 'react';
import type { ReactNode } from 'react';

import {
  getBrowserDeps,
  getDocumentMaybe,
  getWindowMaybe,
  reportError,
  asRecord,
} from '../../../services/api.js';

type Props = {
  label?: string;
  app?: unknown;
  children: ReactNode;
};

type State = { error: unknown | null };

type ReloadLocationLike = { reload: () => void };
type DefaultViewLike = { location?: unknown };
type DocumentLike = { defaultView?: DefaultViewLike | null };

type BrowserDepsLike = { location?: unknown };
type WindowLike = { location?: unknown };

function asReloadLocation(v: unknown): ReloadLocationLike | null {
  const rec = asRecord<ReloadLocationLike>(v);
  return rec && typeof rec.reload === 'function' ? rec : null;
}

function readReloadLocation(app: unknown): ReloadLocationLike | null {
  const deps = asRecord<BrowserDepsLike>(getBrowserDeps(app));
  const win = asRecord<WindowLike>(getWindowMaybe(app));
  const doc = asRecord<DocumentLike>(getDocumentMaybe(app));
  return (
    asReloadLocation(deps?.location) ||
    asReloadLocation(win?.location) ||
    asReloadLocation(doc?.defaultView?.location) ||
    null
  );
}

function tryReloadViaDi(app: unknown | null | undefined): void {
  try {
    readReloadLocation(app)?.reload();
  } catch {
    // ignore
  }
}

export class LazyErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    try {
      reportError(this.props.app, error, {
        where: 'ui/react/LazyErrorBoundary',
        op: 'lazyChunkLoad',
        label: this.props.label || null,
      });
    } catch {
      // ignore
    }
    try {
      console.error('[WardrobePro] Lazy chunk load failed', error);
    } catch {
      // ignore
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label ? String(this.props.label) : 'רכיב';
    return (
      <div style={{ padding: 16 }} data-no-dismiss-edit="1">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>שגיאת טעינה: {label}</div>
        <div style={{ opacity: 0.9, lineHeight: 1.6 }}>
          לפעמים זה קורה בגלל קאש ישן או קובץ JS שחסר בשרת. נסה לרענן.
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-save" onClick={() => tryReloadViaDi(this.props.app)}>
            רענן
          </button>
          <div style={{ fontSize: 12, opacity: 0.85, alignSelf: 'center' }}>אם זה חוזר: Ctrl+F5</div>
        </div>
      </div>
    );
  }
}
