export function classifyPlaywrightPreflightError(error) {
  const message = extractPlaywrightPreflightMessage(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("executable doesn't exist") ||
    lower.includes('please run the following command') ||
    lower.includes('playwright install')
  )
    return 'missing-browser';
  if (
    lower.includes('eai_again') ||
    lower.includes('enotfound') ||
    lower.includes('getaddrinfo') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('failed to download')
  ) {
    return 'network';
  }
  if (lower.includes('spawn eperm') || lower.includes('eacces') || lower.includes('access is denied')) {
    return 'permission-denied';
  }
  if (lower.includes('err_blocked_by_administrator') || lower.includes('blocked_by_administrator'))
    return 'navigation-blocked';
  if (lower.includes('failed to launch') || lower.includes('browser closed')) return 'launch-failure';
  return 'unknown';
}

export function extractPlaywrightPreflightMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error.trim();
  if (typeof error.message === 'string') return error.message.trim();
  return String(error).trim();
}

export function describePlaywrightBrowserResolution(browserResolution = {}) {
  if (browserResolution.browserSource === 'system-chromium' && browserResolution.executablePath) {
    return `system Chromium at ${browserResolution.executablePath}`;
  }
  return 'Playwright bundled Chromium';
}

export function formatPlaywrightPreflightReport({ browserName = 'Chromium', browserResolution, error } = {}) {
  const message = extractPlaywrightPreflightMessage(error);
  const reason = classifyPlaywrightPreflightError(error);
  const browserDetail = describePlaywrightBrowserResolution(browserResolution);
  const lines = [`[WardrobePro] Playwright ${browserName} preflight failed.`];
  lines.push(`Browser target: ${browserDetail}`);
  if (reason === 'missing-browser')
    lines.push(
      'Browser binaries are not installed in this environment and no usable system Chromium fallback was available.'
    );
  else if (reason === 'network')
    lines.push('Browser binaries could not be downloaded because network/DNS access is unavailable.');
  else if (reason === 'permission-denied')
    lines.push('Browser launch was denied by local OS policy, sandbox restrictions, or security tooling.');
  else if (reason === 'navigation-blocked')
    lines.push('Browser launch succeeded, but real navigation is blocked by environment or browser policy.');
  else if (reason === 'launch-failure')
    lines.push('Browser launch failed even though a browser target was resolved.');
  else lines.push('Browser preflight failed for an unknown reason.');
  if (message) {
    lines.push('', 'Original error:', message);
  }
  lines.push(
    '',
    'Recommended next steps:',
    '  1. Run: npm run e2e:install',
    '  2. Re-run: npm run e2e:smoke:preflight',
    '  3. If bundled browsers are unavailable, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or rely on a detected system Chromium',
    '  4. If system Chromium launches but blocks navigation, use bundled Playwright browsers in a less restricted environment',
    '  5. As a fallback sanity check, use: npm run e2e:smoke:list'
  );
  return lines.join('\n');
}
