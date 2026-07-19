import { Component } from 'react';
import type { ReactNode } from 'react';

import {
  getBrowserDeps,
  getDocumentMaybe,
  getWindowMaybe,
  reportError,
  asRecord,
} from '../../../services/api.js';
import { requestReleaseAssetRecovery } from '../release_asset_recovery.js';
import { Button } from './Button.js';

type Props = {
  label?: string;
  app?: unknown;
  errorTestId?: string;
  children: ReactNode;
};

type State = { error: unknown };

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

function tryReloadViaDi(app: unknown): void {
  try {
    readReloadLocation(app)?.reload();
  } catch {
    // ignore
  }
}

function tryRecoverOrReload(app: unknown, error: unknown): void {
  if (requestReleaseAssetRecovery(app, error, 'lazy-chunk-load')) return;
  tryReloadViaDi(app);
}

export class LazyErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    requestReleaseAssetRecovery(this.props.app, error, 'lazy-chunk-load');
    try {
      reportError(this.props.app, error, {
        where: 'ui/react/LazyErrorBoundary',
        op: 'lazyChunkLoad',
        label: this.props.label || null,
      });
    } catch {
      // ignore
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label ? String(this.props.label) : 'רכיב';
    return (
      <div style={{ padding: 16 }} data-no-dismiss-edit="1" data-testid={this.props.errorTestId}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>שגיאת טעינה: {label}</div>
        <div style={{ opacity: 0.9, lineHeight: 1.6 }}>
          לפעמים זה קורה בגלל קאש ישן או קובץ JS שחסר בשרת. נסה לרענן.
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="save" onClick={() => tryRecoverOrReload(this.props.app, error)}>
            רענן
          </Button>
          <div style={{ fontSize: 12, opacity: 0.85, alignSelf: 'center' }}>אם זה חוזר: Ctrl+F5</div>
        </div>
      </div>
    );
  }
}
