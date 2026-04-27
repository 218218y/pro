import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('debug console surface is installed without exposing global App', () => {
  const entry = read('esm/entry_pro_main.ts');
  const browserBoot = read('esm/entry_pro_main_browser_boot.ts');
  const debugSurface = read('esm/native/runtime/debug_console_surface.ts');
  const observabilitySurface = read('esm/native/runtime/observability_surface_full.ts');
  const domGlobals = read('types/dom_globals.d.ts');

  assert.match(entry, /runBrowserBootSetup/);
  assert.match(browserBoot, /installObservabilityForBuild\(bootApp, bootWindow\)/);
  assert.match(observabilitySurface, /export function installObservabilityForBuild\(/);
  assert.match(observabilitySurface, /installDebugConsoleSurface\(App, win\)/);
  assert.match(debugSurface, /Object\.defineProperty\(win, '__WP_DEBUG__'/);
  assert.match(debugSurface, /getStats\(\): StoreDebugStats \| null/);
  assert.match(debugSurface, /resetStats\(\): StoreDebugStats \| null/);
  assert.match(debugSurface, /getTopSources\(limit\?: number\): StoreSourceDebugStat\[\]/);
  assert.match(debugSurface, /getBuildDebugStats\?: \(\) => BuilderDebugStatsLike;/);
  assert.match(debugSurface, /getTopReasons\(limit\?: number\): BuildReasonDebugStatLike\[\]/);
  assert.match(debugSurface, /getBudget\(\): BuildDebugBudgetSummaryLike \| null/);
  assert.match(debugSurface, /getPlatformRenderDebugBudget/);
  assert.match(debugSurface, /getStats\(\): RenderFollowThroughDebugStatsLike \| null/);
  assert.match(debugSurface, /getBudget\(\): RenderFollowThroughBudgetSummaryLike \| null/);
  assert.match(debugSurface, /getCanvasPickingClickHandler/);
  assert.match(debugSurface, /clickNdc\(x: number, y: number\): boolean/);
  assert.match(debugSurface, /hoverNdc\(x: number, y: number\): boolean/);
  assert.match(debugSurface, /inspectCanvasPickingClickNdc/);
  assert.match(debugSurface, /inspectNdc\(x: number, y: number\)/);
  assert.match(domGlobals, /__WP_DEBUG__\?: WardrobeProDebugConsoleSurface;/);
  assert.match(debugSurface, /build:\s*\{/);
  assert.match(debugSurface, /render:\s*\{/);
  assert.match(debugSurface, /canvas:\s*\{/);

  assert.doesNotMatch(debugSurface, /window\.App|globalThis\.App/);
});
