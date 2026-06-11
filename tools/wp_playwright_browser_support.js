import fs from 'node:fs';
import process from 'node:process';

export const SYSTEM_CHROMIUM_CANDIDATES = Object.freeze({
  linux: Object.freeze([
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ]),
  win32: Object.freeze([
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
  ]),
  darwin: Object.freeze([
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ]),
});

export function getSystemChromiumCandidates(platform = process.platform) {
  return SYSTEM_CHROMIUM_CANDIDATES[platform] || [];
}

export function detectSystemChromiumExecutable({
  env = process.env,
  existsSync = fs.existsSync,
  platform = process.platform,
} = {}) {
  const disableSystemChromium =
    typeof env.PLAYWRIGHT_DISABLE_SYSTEM_CHROMIUM === 'string'
      ? ['1', 'true', 'yes'].includes(env.PLAYWRIGHT_DISABLE_SYSTEM_CHROMIUM.trim().toLowerCase())
      : false;
  if (disableSystemChromium) return null;
  const envPath =
    typeof env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH === 'string'
      ? env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.trim()
      : '';
  if (envPath && existsSync(envPath)) return envPath;
  for (const candidate of getSystemChromiumCandidates(platform)) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolvePlaywrightChromiumLaunchOptions({
  env = process.env,
  existsSync = fs.existsSync,
  platform = process.platform,
} = {}) {
  const executablePath = detectSystemChromiumExecutable({ env, existsSync, platform });
  if (!executablePath) {
    return {
      browserSource: 'playwright-bundled',
      executablePath: null,
      launchOptions: {},
    };
  }
  const args = [];
  if (platform === 'linux') {
    args.push('--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox');
  }
  return {
    browserSource: 'system-chromium',
    executablePath,
    launchOptions: {
      executablePath,
      args,
    },
  };
}
