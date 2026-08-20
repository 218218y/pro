import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getInterfaceFact, getTypeLiteralPropertyFacts } from './_semantic_source_contracts.js';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

test('debug console surface is installed without exposing global App', () => {
  const entry = read('esm/entry_pro_main.ts');
  const browserBoot = read('esm/entry_pro_main_browser_boot.ts');
  const releaseMain = read('esm/release_main.ts');
  const debugSurface = read('esm/native/runtime/debug_console_surface.ts');
  const observabilitySurface = read('esm/native/runtime/observability_surface_full.ts');
  const domGlobals = read('types/dom_globals.d.ts');
  const runtimeTypes = read('types/runtime.ts');

  assert.match(entry, /runBrowserBootSetup/);
  assert.match(browserBoot, /installObservabilityForBuild\(bootApp, bootWindow\)/);
  assert.match(releaseMain, /installObservabilityForBuild\(app, win\)/);
  assert.match(releaseMain, /startPerfSpan\(app, 'boot\.browser\.setup'\)/);
  assert.match(observabilitySurface, /export function installObservabilityForBuild\(/);
  assert.match(observabilitySurface, /installDebugConsoleSurface\(App, win\)/);
  assert.match(debugSurface, /Object\.defineProperty\(win, '__WP_DEBUG__'/);
  assert.match(debugSurface, /getStats\(\): StoreDebugStats \| null/);
  assert.match(debugSurface, /resetStats\(\): StoreDebugStats \| null/);
  const storeDebug = new Map(
    getInterfaceFact(runtimeTypes, 'WardrobeProDebugStoreConsoleSurface', 'types/runtime.ts').properties.map(
      property => [property.name, property]
    )
  );
  assert.deepEqual(storeDebug.get('getTopSources'), {
    name: 'getTopSources',
    optional: false,
    readonly: false,
    type: 'fn(limit?:number)->StoreSourceDebugStat[]',
  });
  const buildDebug = new Map(
    getInterfaceFact(runtimeTypes, 'WardrobeProDebugBuildConsoleSurface', 'types/runtime.ts').properties.map(
      property => [property.name, property]
    )
  );
  assert.deepEqual(buildDebug.get('getTopReasons'), {
    name: 'getTopReasons',
    optional: false,
    readonly: false,
    type: 'fn(limit?:number)->BuildReasonDebugStatLike[]',
  });
  const builderServiceDebug = new Map(
    getTypeLiteralPropertyFacts(debugSurface, 'BuilderServiceWithDebug', 'debug_console_surface.ts').map(
      property => [property.name, property]
    )
  );
  assert.deepEqual(builderServiceDebug.get('getBuildDebugStats'), {
    name: 'getBuildDebugStats',
    optional: true,
    readonly: false,
    type: 'fn()->BuilderDebugStatsLike',
  });
  assert.match(debugSurface, /getBudget\(\): BuildDebugBudgetSummaryLike \| null/);
  assert.match(debugSurface, /getPlatformRenderDebugBudget/);
  assert.match(debugSurface, /getStats\(\): RenderFollowThroughDebugStatsLike \| null/);
  assert.match(debugSurface, /getBudget\(\): RenderFollowThroughBudgetSummaryLike \| null/);
  assert.match(debugSurface, /getCanvasPickingClickHandler/);
  assert.match(debugSurface, /clickNdc\(x: number, y: number\): boolean/);
  assert.match(debugSurface, /hoverNdc\(x: number, y: number\): boolean/);
  assert.match(debugSurface, /inspectCanvasPickingClickNdc/);
  assert.match(debugSurface, /inspectNdc\(x: number, y: number\)/);
  assert.match(debugSurface, /createSceneGeometrySnapshot\(getWardrobeGroup\(App\)\)/);
  assert.match(debugSurface, /getGeometrySnapshot\(\)/);
  const windowSurface = new Map(
    getInterfaceFact(domGlobals, 'Window', 'types/dom_globals.d.ts').properties.map(property => [
      property.name,
      property,
    ])
  );
  assert.deepEqual(windowSurface.get('__WP_DEBUG__'), {
    name: '__WP_DEBUG__',
    optional: true,
    readonly: false,
    type: 'WardrobeProDebugConsoleSurface',
  });
  assert.match(debugSurface, /build:\s*\{/);
  assert.match(debugSurface, /render:\s*\{/);
  assert.match(debugSurface, /canvas:\s*\{/);
  assert.match(debugSurface, /scene:\s*\{/);

  assert.doesNotMatch(debugSurface, /window\.App|globalThis\.App/);
});
