import { expect, type Page, type TestInfo } from '@playwright/test';

import { getPlaywrightCriticalMatrixProfile } from '../../../tools/wp_playwright_matrix_profiles.js';

export type SceneGeometrySnapshot = {
  version: 1;
  fingerprint: string;
  rootName: string;
  summary: {
    nodeCount: number;
    visibleNodeCount: number;
    meshCount: number;
    geometryCount: number;
    partNodeCount: number;
    uniquePartCount: number;
    vertexCount: number;
    invalidNumberCount: number;
    maxDepth: number;
  };
  partIds: string[];
  violations: string[];
};

type BrowserProfileSnapshot = {
  width: number;
  height: number;
  deviceScaleFactor: number;
  maxTouchPoints: number;
  reducedMotion: boolean;
  portrait: boolean;
};

export async function readSceneGeometrySnapshot(page: Page): Promise<SceneGeometrySnapshot> {
  const snapshot = await page.evaluate(() => window.__WP_DEBUG__?.scene?.getGeometrySnapshot?.() || null);
  if (!snapshot) throw new Error('Expected __WP_DEBUG__.scene.getGeometrySnapshot() during E2E matrix');
  return snapshot as SceneGeometrySnapshot;
}

export function expectHealthySceneGeometry(snapshot: SceneGeometrySnapshot): void {
  expect(snapshot.version).toBe(1);
  expect(snapshot.fingerprint).toMatch(/^scene-v1-[0-9a-f]{8}$/u);
  expect(snapshot.violations, `Scene violations:\n${snapshot.violations.join('\n')}`).toEqual([]);
  expect(snapshot.summary.nodeCount).toBeGreaterThan(1);
  expect(snapshot.summary.visibleNodeCount).toBeGreaterThan(0);
  expect(snapshot.summary.meshCount).toBeGreaterThan(0);
  expect(snapshot.summary.geometryCount).toBeGreaterThan(0);
  expect(snapshot.summary.partNodeCount).toBeGreaterThan(0);
  expect(snapshot.summary.uniquePartCount).toBeGreaterThan(0);
  expect(snapshot.summary.vertexCount).toBeGreaterThan(0);
  expect(snapshot.summary.invalidNumberCount).toBe(0);
}

export async function expectCriticalMatrixBrowserProfile(page: Page, testInfo: TestInfo): Promise<void> {
  const expected = getPlaywrightCriticalMatrixProfile(testInfo.project.name);
  if (!expected) throw new Error(`Unknown critical matrix project: ${testInfo.project.name}`);

  const actual = await page.evaluate<BrowserProfileSnapshot>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    deviceScaleFactor: window.devicePixelRatio,
    maxTouchPoints: navigator.maxTouchPoints,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    portrait: window.matchMedia('(orientation: portrait)').matches,
  }));

  expect(actual.width).toBe(expected.viewport.width);
  expect(actual.height).toBe(expected.viewport.height);
  expect(actual.deviceScaleFactor).toBe(expected.deviceScaleFactor);
  expect(actual.maxTouchPoints > 0).toBe(expected.hasTouch);
  expect(actual.reducedMotion).toBe(expected.reducedMotion === 'reduce');
  expect(actual.portrait).toBe(expected.viewport.height > expected.viewport.width);
}

export async function expectPrimaryViewportGeometry(page: Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const viewer = document.getElementById('viewer-container');
    const canvas = viewer?.querySelector('canvas') || null;
    const sidebar = document.getElementById('reactSidebarRoot');
    const viewerRect = viewer?.getBoundingClientRect() || null;
    const canvasRect = canvas?.getBoundingClientRect() || null;
    const sidebarRect = sidebar?.getBoundingClientRect() || null;
    return {
      viewer: viewerRect ? { width: viewerRect.width, height: viewerRect.height } : null,
      canvas: canvasRect ? { width: canvasRect.width, height: canvasRect.height } : null,
      sidebar: sidebarRect ? { width: sidebarRect.width, height: sidebarRect.height } : null,
    };
  });

  expect(geometry.viewer).not.toBeNull();
  expect(geometry.canvas).not.toBeNull();
  expect(geometry.sidebar).not.toBeNull();
  expect(geometry.viewer!.width).toBeGreaterThan(0);
  expect(geometry.viewer!.height).toBeGreaterThan(0);
  expect(geometry.canvas!.width).toBeGreaterThan(0);
  expect(geometry.canvas!.height).toBeGreaterThan(0);
  expect(geometry.sidebar!.width).toBeGreaterThan(0);
  expect(geometry.sidebar!.height).toBeGreaterThan(0);
}
