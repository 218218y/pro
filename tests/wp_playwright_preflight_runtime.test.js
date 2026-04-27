import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPlaywrightPreflightError,
  describePlaywrightBrowserResolution,
  formatPlaywrightPreflightReport,
} from '../tools/wp_playwright_preflight_support.js';
import {
  detectSystemChromiumExecutable,
  getSystemChromiumCandidates,
  resolvePlaywrightChromiumLaunchOptions,
} from '../tools/wp_playwright_browser_support.js';

test('classifyPlaywrightPreflightError detects missing browser installs', () => {
  const error = new Error(
    "browserType.launch: Executable doesn't exist at /tmp/chromium\nPlease run the following command to download new browsers: npx playwright install"
  );
  assert.equal(classifyPlaywrightPreflightError(error), 'missing-browser');
});

test('classifyPlaywrightPreflightError detects network failures', () => {
  const error = new Error('getaddrinfo EAI_AGAIN cdn.playwright.dev');
  assert.equal(classifyPlaywrightPreflightError(error), 'network');
});

test('classifyPlaywrightPreflightError detects permission-denied launches', () => {
  const error = new Error('browserType.launch: spawn EPERM');
  assert.equal(classifyPlaywrightPreflightError(error), 'permission-denied');
});

test('classifyPlaywrightPreflightError detects navigation-blocked browser policies', () => {
  const error = new Error(
    'page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:5174/index_pro.html'
  );
  assert.equal(classifyPlaywrightPreflightError(error), 'navigation-blocked');
});

test('detectSystemChromiumExecutable prefers explicit env path when it exists', () => {
  const executable = detectSystemChromiumExecutable({
    env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/custom/chromium' },
    existsSync: candidate => candidate === '/custom/chromium',
  });
  assert.equal(executable, '/custom/chromium');
});

test('resolvePlaywrightChromiumLaunchOptions adds linux-safe args for system chromium', () => {
  const resolution = resolvePlaywrightChromiumLaunchOptions({
    env: { PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/custom/chromium' },
    existsSync: candidate => candidate === '/custom/chromium',
    platform: 'linux',
  });
  assert.equal(resolution.browserSource, 'system-chromium');
  assert.equal(resolution.launchOptions.executablePath, '/custom/chromium');
  assert.deepEqual(resolution.launchOptions.args, [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
  ]);
});

test('getSystemChromiumCandidates includes Windows Chrome and Edge fallbacks', () => {
  const candidates = getSystemChromiumCandidates('win32');
  assert.ok(candidates.includes('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'));
  assert.ok(candidates.includes('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'));
});

test('detectSystemChromiumExecutable discovers Windows-installed Chrome', () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executable = detectSystemChromiumExecutable({
    platform: 'win32',
    env: {},
    existsSync: candidate => candidate === chromePath,
  });
  assert.equal(executable, chromePath);
});

test('resolvePlaywrightChromiumLaunchOptions uses Windows system Chromium without linux-only flags', () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const resolution = resolvePlaywrightChromiumLaunchOptions({
    platform: 'win32',
    env: {},
    existsSync: candidate => candidate === chromePath,
  });
  assert.equal(resolution.browserSource, 'system-chromium');
  assert.equal(resolution.launchOptions.executablePath, chromePath);
  assert.deepEqual(resolution.launchOptions.args, []);
});

test('formatPlaywrightPreflightReport includes system-browser fallback guidance', () => {
  const report = formatPlaywrightPreflightReport({
    browserName: 'Chromium',
    browserResolution: { browserSource: 'playwright-bundled', executablePath: null },
    error: new Error('getaddrinfo EAI_AGAIN cdn.playwright.dev'),
  });
  assert.match(report, /Playwright Chromium preflight failed/);
  assert.match(report, /Playwright bundled Chromium/);
  assert.match(report, /PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH/);
  assert.match(report, /npm run e2e:smoke:list/);
});

test('formatPlaywrightPreflightReport explains permission-denied launches', () => {
  const report = formatPlaywrightPreflightReport({
    browserName: 'Chromium',
    browserResolution: {
      browserSource: 'system-chromium',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    },
    error: new Error('browserType.launch: spawn EPERM'),
  });
  assert.match(report, /denied by local OS policy, sandbox restrictions, or security tooling/);
});

test('describePlaywrightBrowserResolution reports system chromium path', () => {
  const description = describePlaywrightBrowserResolution({
    browserSource: 'system-chromium',
    executablePath: '/usr/bin/chromium',
  });
  assert.equal(description, 'system Chromium at /usr/bin/chromium');
});
