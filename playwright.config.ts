import { defineConfig } from '@playwright/test';
import { resolvePlaywrightChromiumLaunchOptions } from './tools/wp_playwright_browser_support.js';
import { resolveNpmRunCommandString } from './tools/wp_npm_spawn_support.js';

const { launchOptions } = resolvePlaywrightChromiumLaunchOptions();
const webServerCommand = resolveNpmRunCommandString('start:e2e');

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
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
    launchOptions,
  },
  webServer: {
    command: webServerCommand,
    url: 'http://127.0.0.1:5174/index_pro.html',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
