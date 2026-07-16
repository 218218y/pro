import type {
  CloudSyncCredentialState,
  CloudSyncCredentialStatus,
  CloudSyncGatewayFailure,
  CloudSyncRoomCredential,
} from '../../../types';

export const CLOUD_SYNC_CREDENTIAL_RENEW_WINDOW_MS = 24 * 60 * 60 * 1000;

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function decodeBase64UrlAscii(value: string): string | null {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/').replace(/=+$/u, '');
  let bits = 0;
  let bitCount = 0;
  let result = '';
  for (const char of normalized) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return null;
    bits = (bits << 6) | digit;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      result += String.fromCharCode((bits >> bitCount) & 0xff);
      bits &= bitCount ? (1 << bitCount) - 1 : 0;
    }
  }
  return result;
}

export function readCloudSyncRoomTokenExpiresAt(token: unknown): string {
  const parts = readString(token).split('.');
  if (parts.length !== 3) return '';
  try {
    const payload = decodeBase64UrlAscii(parts[1] || '');
    if (!payload) return '';
    const parsed: unknown = JSON.parse(payload);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '';
    const exp = (parsed as { exp?: unknown }).exp;
    if (typeof exp !== 'number' || !Number.isInteger(exp) || exp <= 0) return '';
    return new Date(exp * 1000).toISOString();
  } catch {
    return '';
  }
}

export function normalizeCloudSyncRoomCredential(
  value: unknown,
  opts: { deriveExpiresAtFromToken?: boolean } = {}
): CloudSyncRoomCredential | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const room = readString(rec.room);
  const token = readString(rec.token);
  const suppliedExpiresAt = readString(rec.expiresAt);
  const expiresAt =
    suppliedExpiresAt || (opts.deriveExpiresAtFromToken ? readCloudSyncRoomTokenExpiresAt(token) : '');
  const expiresAtMs = Date.parse(expiresAt);
  if (!room || !token || !Number.isFinite(expiresAtMs)) return null;
  return { room, token, expiresAt: new Date(expiresAtMs).toISOString() };
}

export function classifyCloudSyncCredential(
  credential: CloudSyncRoomCredential | null,
  now = Date.now()
): CloudSyncCredentialState {
  if (!credential) return 'missing';
  const expiresAt = Date.parse(credential.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return 'expired';
  return expiresAt <= now + CLOUD_SYNC_CREDENTIAL_RENEW_WINDOW_MS ? 'expiring' : 'active';
}

export function buildCloudSyncCredentialStatus(args: {
  isPublic: boolean;
  credential?: CloudSyncRoomCredential | null;
  failure?: CloudSyncGatewayFailure | null;
  now?: number;
}): CloudSyncCredentialStatus {
  const now = args.now ?? Date.now();
  if (args.failure?.kind === 'rate-limit') {
    return {
      state: 'rate-limited',
      expiresAt: args.credential?.expiresAt || '',
      retryAt: args.failure.retryAfterMs ? now + args.failure.retryAfterMs : 0,
      failureKind: args.failure.kind,
    };
  }
  if (args.failure?.kind === 'network') {
    return {
      state: 'offline',
      expiresAt: args.credential?.expiresAt || '',
      retryAt: 0,
      failureKind: args.failure.kind,
    };
  }
  if (args.failure?.kind === 'room-expired') {
    return {
      state: 'room-expired',
      expiresAt: '',
      retryAt: 0,
      failureKind: args.failure.kind,
    };
  }
  if (args.failure) {
    return {
      state: args.failure.kind === 'auth-expired' ? 'expired' : 'error',
      expiresAt: args.credential?.expiresAt || '',
      retryAt: 0,
      failureKind: args.failure.kind,
    };
  }
  return {
    state: args.isPublic ? 'public' : classifyCloudSyncCredential(args.credential || null, now),
    expiresAt: args.credential?.expiresAt || '',
    retryAt: 0,
    failureKind: '',
  };
}
