export const CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES = Object.freeze([
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com https://mail.google.com",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://gmail.googleapis.com",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: https://accounts.google.com https://mail.google.com",
  "media-src 'self' blob:",
  "manifest-src 'self'",
]);

export const CONTENT_SECURITY_POLICY_REPORT_ONLY = CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES.join('; ');

export const GLOBAL_BROWSER_SECURITY_HEADER_LINES = Object.freeze([
  'X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
  `Content-Security-Policy-Report-Only: ${CONTENT_SECURITY_POLICY_REPORT_ONLY}`,
]);

export function formatGlobalBrowserSecurityHeaders(indent = '') {
  return GLOBAL_BROWSER_SECURITY_HEADER_LINES.map(line => `${indent}${line}`);
}
