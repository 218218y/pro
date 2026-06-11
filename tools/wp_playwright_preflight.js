#!/usr/bin/env node
import http from 'node:http';
import { chromium } from '@playwright/test';
import { formatPlaywrightPreflightReport } from './wp_playwright_preflight_support.js';
import { resolvePlaywrightChromiumLaunchOptions } from './wp_playwright_browser_support.js';

function createProbeServer() {
  const html = '<html><body><div id="ok">ok</div></body></html>';
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(html);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to resolve Playwright preflight probe address.')));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

const browserResolution = resolvePlaywrightChromiumLaunchOptions();
let browser;
let probeServer;
try {
  const probe = await createProbeServer();
  probeServer = probe.server;
  browser = await chromium.launch({ headless: true, ...browserResolution.launchOptions });
  const page = await browser.newPage();
  const response = await page.goto(probe.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  if (!response || !response.ok()) {
    throw new Error(
      `Playwright Chromium navigation probe returned an invalid response (${response ? response.status() : 'no-response'}).`
    );
  }
  if ((await page.locator('#ok').textContent()) !== 'ok') {
    throw new Error('Playwright Chromium navigation probe loaded but failed the inline DOM sanity check.');
  }
  await browser.close();
  await new Promise(resolve => probeServer.close(resolve));
  const detail =
    browserResolution.browserSource === 'system-chromium'
      ? `using system Chromium at ${browserResolution.executablePath}`
      : 'using Playwright bundled Chromium';
  console.log(`[WardrobePro] Playwright Chromium preflight passed (${detail}).`);
} catch (error) {
  if (browser) {
    try {
      await browser.close();
    } catch {}
  }
  if (probeServer) {
    try {
      await new Promise(resolve => probeServer.close(resolve));
    } catch {}
  }
  console.error(formatPlaywrightPreflightReport({ browserName: 'Chromium', browserResolution, error }));
  process.exit(1);
}
