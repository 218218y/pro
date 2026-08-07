import { getWindowMaybe, reportError } from '../../services/api.js';
import type { UnknownRecord } from '../../../../types';

type RecoveryWindowLike = {
  __WP_RECOVER_FROM_STALE_ASSET__?: (assetUrl: string, reason: string) => unknown;
  location?: {
    href?: string;
    reload?: () => void;
    replace?: (url: string) => void;
  };
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function asRecoveryWindow(value: unknown): RecoveryWindowLike | null {
  return isRecord(value) ? (value as RecoveryWindowLike) : null;
}

function readStringProp(value: unknown, key: string): string {
  const rec = asRecord(value);
  const out = rec ? rec[key] : undefined;
  return typeof out === 'string' ? out.trim() : '';
}

export function extractRecoverableModuleAssetUrl(error: unknown): string {
  const explicit = readStringProp(error, 'assetUrl');
  if (explicit) return explicit;

  const message = readStringProp(error, 'message');
  const stack = readStringProp(error, 'stack');
  const text = `${message}\n${stack}`;
  const match = text.match(/https?:\/\/[^\s"'<>]+\.js(?:\?[^\s"'<>]*)?/i);
  return match ? match[0] : '';
}

export function isRecoverableModuleImportFailure(error: unknown): boolean {
  const rec = asRecord(error);
  if (rec?.recoverableAsset === true) return true;

  const message = readStringProp(error, 'message');
  const name = readStringProp(error, 'name');
  const stack = readStringProp(error, 'stack');
  const text = `${name}\n${message}\n${stack}`;
  return /Failed to fetch dynamically imported module|Importing a module script failed|Expected a JavaScript(?:-or-Wasm)? module script|ChunkLoadError|Loading chunk \d+ failed|wardrobepro\.chunk-|Release module asset is not available as JavaScript/i.test(
    text
  );
}

function fallbackReload(win: RecoveryWindowLike, assetUrl: string, reason: string): boolean {
  try {
    const loc = win.location;
    if (!loc) return false;
    if (typeof loc.href === 'string' && typeof loc.replace === 'function') {
      const next = new URL(loc.href);
      next.searchParams.set('v', String(Date.now()));
      next.searchParams.set('wp_reload', reason || 'feature-module');
      if (assetUrl) next.searchParams.set('missing_asset', assetUrl.split('/').pop() || 'module');
      loc.replace(next.toString());
      return true;
    }
    if (typeof loc.reload === 'function') {
      loc.reload();
      return true;
    }
  } catch {
    // ignore; caller will continue normal error handling
  }
  return false;
}

export function requestReleaseAssetRecovery(
  app: unknown,
  error: unknown,
  reason = 'feature-module'
): boolean {
  if (!isRecoverableModuleImportFailure(error)) return false;

  const assetUrl = extractRecoverableModuleAssetUrl(error);
  const win = asRecoveryWindow(getWindowMaybe(app));
  if (!win) return false;

  try {
    if (typeof win.__WP_RECOVER_FROM_STALE_ASSET__ === 'function') {
      win.__WP_RECOVER_FROM_STALE_ASSET__(assetUrl, reason);
      return true;
    }
  } catch (recoveryError) {
    try {
      reportError(app, recoveryError, {
        where: 'native/ui/react/release_asset_recovery',
        op: 'recoverStaleModuleAsset',
        nonFatal: true,
      });
    } catch {
      // reporter-isolation: asset-recovery diagnostics must not interfere with the recovery fallback itself.
    }
  }

  return fallbackReload(win, assetUrl, reason);
}
