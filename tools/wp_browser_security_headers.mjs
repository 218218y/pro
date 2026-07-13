export const CSP_REPORTING_GROUP = 'csp-endpoint';
export const CSP_REPORTING_PATH = '/__csp-report';

export const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SOURCES = Object.freeze([
  'https://static.cloudflareinsights.com/beacon.min.js',
  'https://static.cloudflareinsights.com/beacon.min.js/',
]);

export const CONTENT_SECURITY_POLICY_ENFORCED_DIRECTIVES = Object.freeze([
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
]);

export const CONTENT_SECURITY_POLICY_ENFORCED = CONTENT_SECURITY_POLICY_ENFORCED_DIRECTIVES.join('; ');

export const CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES = Object.freeze([
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://accounts.google.com https://mail.google.com",
  "script-src 'self' https://accounts.google.com",
  `script-src-elem 'self' https://accounts.google.com ${CLOUDFLARE_WEB_ANALYTICS_SCRIPT_SOURCES.join(' ')}`,
  "style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://gmail.googleapis.com",
  "worker-src 'self' blob:",
  "frame-src 'self' blob: https://accounts.google.com https://mail.google.com",
  "media-src 'self' blob:",
  "manifest-src 'self'",
  `report-to ${CSP_REPORTING_GROUP}`,
  `report-uri ${CSP_REPORTING_PATH}`,
]);

export const CONTENT_SECURITY_POLICY_REPORT_ONLY = CONTENT_SECURITY_POLICY_REPORT_ONLY_DIRECTIVES.join('; ');

export const GLOBAL_BROWSER_SECURITY_HEADER_LINES = Object.freeze([
  'X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()',
  `Reporting-Endpoints: ${CSP_REPORTING_GROUP}="${CSP_REPORTING_PATH}"`,
  `Content-Security-Policy: ${CONTENT_SECURITY_POLICY_ENFORCED}`,
  `Content-Security-Policy-Report-Only: ${CONTENT_SECURITY_POLICY_REPORT_ONLY}`,
]);

export function formatGlobalBrowserSecurityHeaders(indent = '') {
  return GLOBAL_BROWSER_SECURITY_HEADER_LINES.map(line => `${indent}${line}`);
}
