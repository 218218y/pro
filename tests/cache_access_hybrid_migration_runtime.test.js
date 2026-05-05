import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relPath, cache = new Map()) {
  const file = path.join(process.cwd(), relPath);
  if (cache.has(file)) return cache.get(file).exports;

  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: file,
  }).outputText;

  const mod = { exports: {} };
  cache.set(file, mod);

  const localRequire = specifier => {
    if (specifier.startsWith('.')) {
      const target = path.join(path.dirname(file), specifier.replace(/\.js$/, '.ts'));
      return loadTsModule(path.relative(process.cwd(), target), cache);
    }
    return require(specifier);
  };

  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

const { getInternalGridMap, getRuntimeCacheServiceMaybe, readStackSplitLowerTopY } = loadTsModule(
  'esm/native/runtime/cache_access.ts'
);

test('cache_access merges hybrid root cache into runtimeCache without overwriting canonical values', () => {
  const canonicalTop = {
    shared: { source: 'runtime-cache' },
    liveOnly: { source: 'runtime-cache' },
  };
  const canonicalBottom = {
    bottomLive: { source: 'runtime-cache' },
  };
  const App = {
    services: {
      runtimeCache: {
        stackSplitLowerTopY: 44,
        internalGridMap: canonicalTop,
        internalGridMapSplitBottom: canonicalBottom,
        noMainSketchWorkspaceMetrics: { source: 'runtime-cache' },
      },
    },
    cache: {
      stackSplitLowerTopY: 12,
      internalGridMap: {
        shared: { source: 'root-cache' },
        migratedOnly: { source: 'root-cache' },
      },
      internalGridMapSplitBottom: {
        bottomLive: { source: 'root-cache' },
        bottomMigratedOnly: { source: 'root-cache' },
      },
      lateOnlyMetric: { source: 'root-cache' },
    },
  };

  const cache = getRuntimeCacheServiceMaybe(App);

  assert.equal(cache, App.services.runtimeCache);
  assert.equal(App.cache, undefined);
  assert.equal(readStackSplitLowerTopY(App), 44);
  assert.equal(App.services.runtimeCache.internalGridMap, canonicalTop);
  assert.equal(App.services.runtimeCache.internalGridMap.shared.source, 'runtime-cache');
  assert.equal(App.services.runtimeCache.internalGridMap.liveOnly.source, 'runtime-cache');
  assert.equal(App.services.runtimeCache.internalGridMap.migratedOnly.source, 'root-cache');
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom, canonicalBottom);
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom.bottomLive.source, 'runtime-cache');
  assert.equal(App.services.runtimeCache.internalGridMapSplitBottom.bottomMigratedOnly.source, 'root-cache');
  assert.deepEqual(App.services.runtimeCache.noMainSketchWorkspaceMetrics, { source: 'runtime-cache' });
  assert.deepEqual(App.services.runtimeCache.lateOnlyMetric, { source: 'root-cache' });
});

test('cache_access adopts root cache when no runtimeCache exists', () => {
  const top = { migrated: true };
  const App = {
    cache: {
      stackSplitLowerTopY: 12,
      internalGridMap: top,
    },
  };

  const cache = getRuntimeCacheServiceMaybe(App);

  assert.equal(cache, App.services.runtimeCache);
  assert.equal(App.cache, undefined);
  assert.equal(readStackSplitLowerTopY(App), 12);
  assert.equal(getInternalGridMap(App), top);
});
