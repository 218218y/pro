// Gmail draft creation helper (OAuth token via Google Identity Services).
// NOTE: Client ID is public. Do NOT embed or ship client_secret in a browser app.

type GmailDraftResult = {
  draftId: string;
  draftUrl?: string;
};

type ImportMetaEnvLike = {
  VITE_GOOGLE_CLIENT_ID?: string;
};

type GsiTokenClientLike = {
  requestAccessToken: (opts: { prompt: '' | 'consent' }) => void;
};

type GoogleAccountsOauth2Like = {
  initTokenClient: (opts: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
  }) => GsiTokenClientLike;
};

type GsiWindowLike = Window & {
  google?: {
    accounts?: {
      oauth2?: GoogleAccountsOauth2Like;
    };
  };
};

type GmailDraftApiResponse = {
  id?: string;
  draft?: { id?: string } | null;
};

const DEFAULT_GOOGLE_CLIENT_ID = '992781090577-cisfr8gkkc4ullc0g8otmc971nmq5ak2.apps.googleusercontent.com';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

let _cachedToken: { token: string; expiresAtMs: number } | null = null;
let _gsiLoadPromise: Promise<void> | null = null;

function _nowMs(): number {
  return Date.now();
}

function _b64FromBytes(bytes: Uint8Array): string {
  // Avoid callstack overflow by chunking.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const part = bytes.subarray(i, i + chunk);
    let s = '';
    for (let j = 0; j < part.length; j++) s += String.fromCharCode(part[j]);
    binary += s;
  }
  return btoa(binary);
}

function _b64Url(s: string): string {
  return (s || '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function _utf8HeaderB64(value: string): string {
  // RFC 2047 encoded-word (B-encoding)
  if (!value) return '';
  let isAscii = true;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0x7f) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) return value;

  const enc = new TextEncoder();
  const bytes = enc.encode(value);
  const b64 = _b64FromBytes(bytes);
  return `=?UTF-8?B?${b64}?=`;
}

function isImportMetaEnvLike(value: unknown): value is ImportMetaEnvLike {
  return !!value && typeof value === 'object';
}

function readImportMetaEnv(): ImportMetaEnvLike | null {
  try {
    const env = Reflect.get(import.meta, 'env');
    return isImportMetaEnvLike(env) ? env : null;
  } catch {
    return null;
  }
}

export function getGoogleClientIdFromEnvOrDefault(): string {
  // Vite injects import.meta.env at build-time.
  try {
    const envId = readImportMetaEnv()?.VITE_GOOGLE_CLIENT_ID;
    if (typeof envId === 'string' && envId.trim()) return envId.trim();
  } catch {
    // ignore
  }
  return DEFAULT_GOOGLE_CLIENT_ID;
}

export async function ensureGoogleIdentityServicesLoaded(
  doc: Document | null,
  win: GsiWindowLike | null
): Promise<void> {
  if (!doc || !win) throw new Error('No DOM');
  if (win.google && win.google.accounts && win.google.accounts.oauth2) return;

  if (_gsiLoadPromise) return _gsiLoadPromise;
  _gsiLoadPromise = new Promise<void>((resolve, reject) => {
    try {
      const existingNode = doc.querySelector('script[data-wp-gsi="1"]');
      const existing = existingNode instanceof HTMLScriptElement ? existingNode : null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
        return;
      }

      const s = doc.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.setAttribute('data-wp-gsi', '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Google script'));
      doc.head.appendChild(s);
    } catch (e) {
      reject(e instanceof Error ? e : new Error('Failed to load Google script'));
    }
  });
  return _gsiLoadPromise;
}

async function _requestToken(
  win: GsiWindowLike,
  clientId: string,
  prompt: '' | 'consent'
): Promise<TokenResponse> {
  return new Promise<TokenResponse>(resolve => {
    const google = win.google;
    const oauth2 = google && google.accounts && google.accounts.oauth2;
    if (!oauth2 || typeof oauth2.initTokenClient !== 'function') {
      resolve({ error: 'no_gsi', error_description: 'Google Identity Services not available' });
      return;
    }

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (resp: TokenResponse) => resolve(resp || {}),
    });

    // Must be called from a user gesture.
    tokenClient.requestAccessToken({ prompt });
  });
}

export async function getGmailComposeAccessToken(opts: {
  doc: Document | null;
  win: GsiWindowLike | null;
  clientId?: string;
  forcePrompt?: boolean;
}): Promise<string> {
  const { doc, win } = opts;
  const clientId = (opts.clientId || '').trim() || getGoogleClientIdFromEnvOrDefault();
  if (!doc || !win) throw new Error('No DOM');

  if (_cachedToken && _cachedToken.expiresAtMs - 15_000 > _nowMs()) {
    return _cachedToken.token;
  }

  await ensureGoogleIdentityServicesLoaded(doc, win);

  const firstPrompt: '' | 'consent' = opts.forcePrompt ? 'consent' : '';
  let tr = await _requestToken(win, clientId, firstPrompt);

  // If we tried silent and got a consent-related error, retry with consent.
  if (
    !tr.access_token &&
    !opts.forcePrompt &&
    tr &&
    typeof tr.error === 'string' &&
    (tr.error === 'consent_required' || tr.error === 'interaction_required')
  ) {
    tr = await _requestToken(win, clientId, 'consent');
  }

  if (!tr || !tr.access_token) {
    const msg = (tr && (tr.error_description || tr.error)) || 'Token request failed';
    throw new Error(msg);
  }

  const ttl =
    typeof tr.expires_in === 'number' && isFinite(tr.expires_in) ? Math.max(30, tr.expires_in) : 3600;
  _cachedToken = { token: tr.access_token, expiresAtMs: _nowMs() + ttl * 1000 };
  return tr.access_token;
}

function _ensurePdfExt(name: string): string {
  const s = String(name || '').trim();
  if (!s) return 'order.pdf';
  return s.toLowerCase().endsWith('.pdf') ? s : `${s}.pdf`;
}

function _encodeRfc5987Utf8(s: string): string {
  // RFC 5987 (used for filename* / name*) expects percent-encoded UTF-8.
  // encodeURIComponent leaves some chars unescaped; we force-escape the RFC specials.
  return encodeURIComponent(String(s || '')).replace(/[!'()*]/g, c => {
    return `%${c.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

function _quoteMimeParamValue(v: string): string {
  // Quoted-string for MIME parameters. Remove CR/LF and escape quotes/backslashes.
  let s = String(v || '');
  s = s.replace(/\r|\n/g, '');
  s = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return s;
}

function _buildMimeWithPdfAttachment(opts: {
  subject: string;
  bodyText: string;
  fileName: string;
  pdfBytes: Uint8Array;
}): string {
  const boundary = `wp_${Math.random().toString(36).slice(2)}_${_nowMs()}`;
  const subj = _utf8HeaderB64(opts.subject);
  const fileNameUtf8 = _ensurePdfExt(opts.fileName);
  // Attachment filename encoding:
  // - Standard: RFC 5987 (filename* / name*) with percent-encoded UTF-8.
  // - Some clients (incl. Gmail UI) prefer the legacy filename= over filename* when both exist.
  //   To make sure Hebrew survives, we OMIT the legacy filename/name when the filename isn't ASCII.
  const fileName5987 = _encodeRfc5987Utf8(fileNameUtf8);
  const pdfBase64 = _b64FromBytes(opts.pdfBytes);

  let isAscii = true;
  for (let i = 0; i < fileNameUtf8.length; i++) {
    if (fileNameUtf8.charCodeAt(i) > 0x7f) {
      isAscii = false;
      break;
    }
  }

  // RFC 5322 uses CRLF.
  const CRLF = '\r\n';
  const parts: string[] = [];
  parts.push('MIME-Version: 1.0');
  parts.push(`Subject: ${subj}`);
  parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  parts.push('');

  parts.push(`--${boundary}`);
  parts.push('Content-Type: text/plain; charset="UTF-8"');
  parts.push('Content-Transfer-Encoding: 7bit');
  parts.push('');
  parts.push(opts.bodyText || '');
  parts.push('');

  parts.push(`--${boundary}`);
  if (isAscii) {
    const q = _quoteMimeParamValue(fileNameUtf8);
    parts.push(`Content-Type: application/pdf; name="${q}"`);
  } else {
    parts.push(`Content-Type: application/pdf; name*=UTF-8''${fileName5987}`);
  }
  parts.push('Content-Transfer-Encoding: base64');
  if (isAscii) {
    const q = _quoteMimeParamValue(fileNameUtf8);
    parts.push(`Content-Disposition: attachment; filename="${q}"`);
  } else {
    parts.push(`Content-Disposition: attachment; filename*=UTF-8''${fileName5987}`);
  }
  parts.push('');
  parts.push(pdfBase64);
  parts.push('');

  parts.push(`--${boundary}--`);
  parts.push('');

  return parts.join(CRLF);
}

export async function createGmailDraftWithPdfAttachment(opts: {
  win: GsiWindowLike | null;
  fetchFn: typeof fetch;
  accessToken: string;
  subject: string;
  bodyText: string;
  fileName: string;
  pdfBytes: Uint8Array;
}): Promise<GmailDraftResult> {
  const mime = _buildMimeWithPdfAttachment({
    subject: opts.subject,
    bodyText: opts.bodyText,
    fileName: opts.fileName,
    pdfBytes: opts.pdfBytes,
  });

  // Gmail API requires base64url of the raw MIME.
  const mimeBytes = new TextEncoder().encode(mime);
  const raw = _b64Url(_b64FromBytes(mimeBytes));

  const res = await opts.fetchFn('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw } }),
  });

  if (!res.ok) {
    let extra = '';
    try {
      extra = await res.text();
    } catch {
      extra = '';
    }
    throw new Error(`Gmail API error (${res.status}): ${extra || res.statusText}`);
  }

  const rawJson = await res.json();
  const json: GmailDraftApiResponse = rawJson && typeof rawJson === 'object' ? rawJson : {};
  const draftId =
    typeof json.id === 'string' ? json.id : typeof json.draft?.id === 'string' ? json.draft.id : '';
  if (!draftId) throw new Error('Draft created but no id returned');

  // Best-effort deep-link.
  const urlA = `https://mail.google.com/mail/#drafts?compose=${encodeURIComponent(draftId)}`;
  const urlB = `https://mail.google.com/mail/#drafts/${encodeURIComponent(draftId)}`;

  return { draftId, draftUrl: urlA || urlB };
}
