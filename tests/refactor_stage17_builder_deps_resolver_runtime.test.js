import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { readSourceText } from '../tools/wp_source_text.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadResolverForRuntimeTest() {
  const source = readSourceText('esm/native/builder/builder_deps_resolver.ts')
    .replace(
      /import \{ assertTHREE \} from '\.\.\/runtime\/api\.js';/,
      `function assertTHREE(App, label = '') {\n  const THREE = App && App.deps && App.deps.THREE;\n  if (!THREE) throw new Error('[WardrobePro] missing THREE for ' + label);\n  return THREE;\n}`
    )
    .replace(
      /import \{ getPlatformPruneCachesSafe \} from '\.\.\/runtime\/platform_access\.js';/,
      `function getPlatformPruneCachesSafe(App) {\n  return App && App.deps && App.deps.platform && typeof App.deps.platform.pruneCachesSafe === 'function'\n    ? App.deps.platform.pruneCachesSafe\n    : null;\n}`
    )
    .replace(/import type \{[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/types';\n/, '');

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;

  const dir = mkdtempSync(join(tmpdir(), 'wardrobepro-builder-deps-resolver-'));
  const file = join(dir, 'builder_deps_resolver_runtime_fixture.mjs');
  writeFileSync(file, transpiled, 'utf8');
  return import(`${pathToFileURL(file).href}?cacheBust=${Date.now()}-${Math.random()}`);
}

function createCompleteFixture() {
  const calls = [];
  const THREE = { name: 'THREE-fixture' };
  const App = {
    deps: {
      THREE,
      platform: {
        pruneCachesSafe(rootNode) {
          calls.push(['platform.pruneCachesSafe', this, rootNode]);
          return 'platform-pruned';
        },
      },
    },
  };

  const builderDeps = {
    util: {
      owner: 'util-owner',
      cleanGroup(value) {
        calls.push(['util.cleanGroup', this, value]);
        return 'cleaned';
      },
    },
    materials: {
      owner: 'materials-owner',
      getMaterial(value) {
        calls.push(['materials.getMaterial', this, value]);
        return { value, owner: this.owner };
      },
      addOutlines(value) {
        calls.push(['materials.addOutlines', this, value]);
        return 'outlined';
      },
    },
    modules: {
      owner: 'modules-owner',
      calculateModuleStructure(value) {
        calls.push(['modules.calculateModuleStructure', this, value]);
        return { value, owner: this.owner };
      },
      createDoorVisual(value) {
        calls.push(['modules.createDoorVisual', this, value]);
        return { value, owner: this.owner };
      },
      createInternalDrawerBox(value) {
        calls.push(['modules.createInternalDrawerBox', this, value]);
        return { value, owner: this.owner };
      },
      buildChestOnly(value) {
        calls.push(['modules.buildChestOnly', this, value]);
        return { value, owner: this.owner };
      },
      buildCornerWing(value) {
        calls.push(['modules.buildCornerWing', this, value]);
        return { value, owner: this.owner };
      },
      __rebuildDrawerMeta(value) {
        calls.push(['modules.__rebuildDrawerMeta', this, value]);
        return { value, owner: this.owner };
      },
    },
    contents: {
      owner: 'contents-owner',
      addDimensionLine(value) {
        calls.push(['contents.addDimensionLine', this, value]);
        return 'dimension-line';
      },
      addHangingClothes(value) {
        calls.push(['contents.addHangingClothes', this, value]);
        return 'hanging';
      },
      addFoldedClothes(value) {
        calls.push(['contents.addFoldedClothes', this, value]);
        return 'folded';
      },
      addRealisticHanger(value) {
        calls.push(['contents.addRealisticHanger', this, value]);
        return 'hanger';
      },
    },
    notes: {
      owner: 'notes-owner',
      getNotesForSave(value) {
        calls.push(['notes.getNotesForSave', this, value]);
        return ['note'];
      },
      restoreNotesFromSave(value) {
        calls.push(['notes.restoreNotesFromSave', this, value]);
        return 'restored';
      },
    },
    render: {
      owner: 'render-owner',
      ensureWardrobeGroup(value) {
        calls.push(['render.ensureWardrobeGroup', this, value]);
        return 'ensured';
      },
      triggerRender(value) {
        calls.push(['render.triggerRender', this, value]);
        return 'rendered';
      },
      showToast(value) {
        calls.push(['render.showToast', this, value]);
        return 'toast';
      },
    },
  };

  return { App, builderDeps, THREE, calls };
}

test('stage17 builder deps resolver resolves required deps and preserves owner bindings', async () => {
  const { resolveBuilderDepsOrThrow } = await loadResolverForRuntimeTest();
  const fixture = createCompleteFixture();

  const resolved = resolveBuilderDepsOrThrow({
    App: fixture.App,
    builderDeps: fixture.builderDeps,
    label: 'stage17-test',
  });

  assert.equal(resolved.THREE, fixture.THREE);
  assert.equal(resolved.cleanGroup('group'), 'cleaned');
  assert.deepEqual(resolved.getMaterial('oak'), { value: 'oak', owner: 'materials-owner' });
  assert.deepEqual(resolved.createDoorVisual('door'), { value: 'door', owner: 'modules-owner' });
  assert.equal(resolved.pruneCachesSafe('root'), 'platform-pruned');

  assert.deepEqual(fixture.calls[0], [
    'render.ensureWardrobeGroup',
    fixture.builderDeps.render,
    fixture.THREE,
  ]);
  assert.deepEqual(fixture.calls[1], ['util.cleanGroup', fixture.builderDeps.util, 'group']);
  assert.deepEqual(fixture.calls[2], ['materials.getMaterial', fixture.builderDeps.materials, 'oak']);
  assert.deepEqual(fixture.calls[3], ['modules.createDoorVisual', fixture.builderDeps.modules, 'door']);
  assert.equal(fixture.calls[4][0], 'platform.pruneCachesSafe');
});

test('stage17 builder deps resolver fails at the resolver boundary for missing critical deps', async () => {
  const { resolveBuilderDepsOrThrow } = await loadResolverForRuntimeTest();
  const complete = createCompleteFixture();

  assert.throws(
    () => resolveBuilderDepsOrThrow({ App: null, builderDeps: complete.builderDeps }),
    /Builder requires App/
  );
  assert.throws(
    () => resolveBuilderDepsOrThrow({ App: complete.App, builderDeps: null }),
    /builder deps missing: deps\.builder/
  );

  const missingCases = [
    ['util.cleanGroup', deps => delete deps.util.cleanGroup, /util\.cleanGroup/],
    ['materials.getMaterial', deps => delete deps.materials.getMaterial, /materials\.getMaterial/],
    ['modules.createDoorVisual', deps => delete deps.modules.createDoorVisual, /modules\.createDoorVisual/],
    [
      'render.ensureWardrobeGroup',
      deps => delete deps.render.ensureWardrobeGroup,
      /builderDeps\.render\.ensureWardrobeGroup/,
    ],
  ];

  for (const [label, mutate, pattern] of missingCases) {
    const fixture = createCompleteFixture();
    mutate(fixture.builderDeps);
    assert.throws(
      () => resolveBuilderDepsOrThrow({ App: fixture.App, builderDeps: fixture.builderDeps, label }),
      pattern,
      label
    );
  }
});

test('stage17 builder deps resolver wraps render group failures with a clear owner message', async () => {
  const { resolveBuilderDepsOrThrow } = await loadResolverForRuntimeTest();
  const fixture = createCompleteFixture();
  fixture.builderDeps.render.ensureWardrobeGroup = function ensureWardrobeGroup() {
    throw new Error('boom');
  };

  assert.throws(
    () => resolveBuilderDepsOrThrow({ App: fixture.App, builderDeps: fixture.builderDeps }),
    /render\.ensureWardrobeGroup failed: boom/
  );
});
