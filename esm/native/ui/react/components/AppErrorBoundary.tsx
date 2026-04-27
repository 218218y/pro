import { Component } from 'react';
import type { ReactNode } from 'react';

import { reportError, getDocumentMaybe, getWindowMaybe, asRecord } from '../../../services/api.js';

type Props = {
  label?: string;
  app?: unknown;
  children: ReactNode;
};

type State = { error: unknown | null };

type ReloadLocationLike = { reload: () => void };
type WindowLike = { location?: unknown };
type DocumentLike = { defaultView?: { location?: unknown } | null };

function asReloadLocation(v: unknown): ReloadLocationLike | null {
  const rec = asRecord<ReloadLocationLike>(v);
  return rec && typeof rec.reload === 'function' ? rec : null;
}

function readReloadLocation(app: unknown): ReloadLocationLike | null {
  const win = asRecord<WindowLike>(getWindowMaybe(app));
  const doc = asRecord<DocumentLike>(getDocumentMaybe(app));
  return asReloadLocation(win?.location) || asReloadLocation(doc?.defaultView?.location) || null;
}

function tryReloadViaDi(app: unknown | null | undefined): void {
  try {
    readReloadLocation(app)?.reload();
  } catch {
    // ignore
  }
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    try {
      reportError(this.props.app, error, {
        where: 'ui/react/AppErrorBoundary',
        op: 'componentDidCatch',
        label: this.props.label || null,
      });
    } catch {
      // ignore
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label ? String(this.props.label) : 'האפליקציה';

    return (
      <div style={{ padding: 16 }} data-no-dismiss-edit="1">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>קרתה שגיאה: {label}</div>
        <div style={{ opacity: 0.9, lineHeight: 1.6 }}>
          משהו כאן נפל. אם זה קורה אחרי עדכון — לפעמים זה קאש ישן. נסה רענון.
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
