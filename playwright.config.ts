import { defineConfig } from '@playwright/test';
import { resolvePlaywrightChromiumLaunchOptions } from './tools/wp_playwright_browser_support.js';
import { PLAYWRIGHT_CRITICAL_MATRIX_PROFILES } from './tools/wp_playwright_matrix_profiles.js';
import { resolveNpmRunCommandString } from './tools/wp_npm_spawn_support.js';

const { launchOptions } = resolvePlaywrightChromiumLaunchOptions();
const webServerCommand = resolveNpmRunCommandString('start:e2e');
const setupTestMatch = /.*\.setup\.ts/;
const criticalMatrixTestMatch = /critical_matrix\.spec\.ts/;

const criticalMatrixProjects = PLAYWRIGHT_CRITICAL_MATRIX_PROFILES.map(profile => ({
  name: profile.name,
  dependencies: ['setup'],
  testMatch: criticalMatrixTestMatch,
  use: {
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    hasTouch: profile.hasTouch,
    reducedMotion: profile.reducedMotion,
  },
}));

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  projects: [
    {
      name: 'setup',
      testMatch: setupTestMatch,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: [setupTestMatch, criticalMatrixTestMatch],
    },
    ...criticalMatrixProjects,
  ],
  use: {
    baseURL: 'http://127.0.0.1:5175',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    launchOptions,
  },
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:5175/index_pro.html',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
