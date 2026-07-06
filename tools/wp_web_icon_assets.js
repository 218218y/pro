// Canonical web-app icon files that may live at the project root and must be
// emitted at the bundled site root. Do not glob arbitrary root images into the
// release output; keep this allowlist explicit so accidental files stay out of
// deployable bundles.
export const WEB_APP_ICON_ASSETS = Object.freeze([
  'favicon.ico',
  'favicon.svg',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'site.webmanifest',
  'manifest.webmanifest',
  'browserconfig.xml',
  'mstile-70x70.png',
  'mstile-144x144.png',
  'mstile-150x150.png',
  'mstile-310x150.png',
  'mstile-310x310.png',
  'safari-pinned-tab.svg',
]);

export function normalizeRootWebAssetName(assetName) {
  const name = String(assetName || '').trim();
  if (!name || name.includes('/') || name.includes('\\\\')) return null;
  return name;
}
