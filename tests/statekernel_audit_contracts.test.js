import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  bundleSources,
  readSource,
  assertMatchesAll,
  assertMatchesAny,
  assertLacksAll,
} from './_source_bundle.js';
import {
  assertCallObjectContract,
  getAssignedFunctionSignatureFact,
  getInterfaceFact,
} from './_semantic_source_contracts.js';

const ROOT_URL = new URL('../esm/native/', import.meta.url);
const ROOT_DIR = fileURLToPath(ROOT_URL);
const CONFIG_WRITE_PATH = fileURLToPath(new URL('../esm/native/kernel/config_write.ts', import.meta.url));

const notesService = bundleSources(
  [
    '../esm/native/ui/notes_service.ts',
    '../esm/native/ui/notes_service_shared.ts',
    '../esm/native/ui/notes_service_sanitize.ts',
    '../esm/native/ui/notes_service_runtime.ts',
  ],
  import.meta.url
);
const stateApi = readSource('../esm/native/kernel/state_api.ts', import.meta.url);
const typesKernel = readSource('../types/kernel.ts', import.meta.url);
const stateApiMetaHistory = bundleSources(
  [
    '../esm/native/kernel/state_api_history_meta_reactivity.ts',
    '../esm/native/kernel/state_api_history_store_reactivity.ts',
    '../esm/native/kernel/state_api_history_store_reactivity_runtime.ts',
    '../esm/native/kernel/state_api_history_namespace.ts',
    '../esm/native/kernel/state_api_meta_namespace.ts',
  ],
  import.meta.url
);
const bootBundle = bundleSources(
  [
    '../esm/native/ui/boot_main.ts',
    '../esm/native/ui/ui_boot_controller_runtime.ts',
    '../esm/native/ui/ui_boot_controller_viewport.ts',
    '../esm/native/ui/ui_boot_controller_store.ts',
  ],
  import.meta.url
);
const canvasPickingBundle = bundleSources(
  [
    '../esm/native/services/canvas_picking_core.ts',
    '../esm/native/services/canvas_picking_click_flow.ts',
    '../esm/native/services/canvas_picking_click_module_refs.ts',
  ],
  import.meta.url
);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules') continue;
      walk(p, out);
      continue;
    }
    if (/\.(ts|tsx|js)$/i.test(ent.name)) out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT_DIR, p).replace(/\\/g, '/');
}

test('[statekernel audit] notes, boot, and canvas writers stay on canonical actions/store seams', () => {
  assertMatchesAll(
    assert,
    notesService,
    [
      /function getMetaActions\(App: NotesServiceApp\): (?:MetaActionsNamespaceLike|NotesMetaActionsLike) \| null/,
      /const payload = notesMeta\.build\('notes:react',/,
      /typeof metaNs\.persist === 'function'/,
    ],
    'notes service'
  );
  assert.deepEqual(
    getAssignedFunctionSignatureFact(notesService, 'notesNs.persist', 'notes_service.bundle.ts'),
    {
      name: 'notesNs.persist',
      async: false,
      params: [{ name: 'meta', optional: true, type: 'ActionMetaLike|UnknownRecord' }],
      returnType: null,
    }
  );
  assertMatchesAny(
    assert,
    notesService,
    [/metaNs\.persist\(payload\);\s*return;/, /metaNs\.persist\(payload\);/],
    'notes service'
  );
  assertLacksAll(assert, notesService, [/App\.stateKernel/, /sk\.persist\(payload\)/], 'notes service');

  assertMatchesAll(assert, stateApi, [/state_api_history_meta_reactivity\.js/], 'state api');
  assertMatchesAll(
    assert,
    stateApiMetaHistory,
    [
      /isActionStubFn\(metaNs\.persist, 'meta:persist'\)/,
      /Delete-pass: persistence nudges should stay on canonical actions\/store paths\./,
      /return metaNs\.touch\?\.\(m\);/,
    ],
    'state history/meta'
  );
  assert.doesNotMatch(stateApiMetaHistory, /sk\['persist'\]/);
  const metaActions = getInterfaceFact(typesKernel, 'MetaActionsNamespaceLike', 'types/kernel.ts');
  assert.equal(
    metaActions?.properties.find(property => property.name === 'persist')?.type,
    'fn(meta?:ActionMetaLike)->unknown'
  );
  assert.deepEqual(
    getAssignedFunctionSignatureFact(
      stateApiMetaHistory,
      'metaNs.persist',
      'state_api_history_meta.bundle.ts'
    ),
    {
      name: 'metaNs.persist',
      async: false,
      params: [{ name: 'meta', optional: true, type: 'ActionMetaLike' }],
      returnType: null,
    }
  );

  assertMatchesAll(
    assert,
    bootBundle,
    [
      /from '\.\.\/services\/api\.js';/,
      /installStoreReactivityOrThrow\(App, 'UI boot store reactivity'\)/,
      /commitBootSeedUiSnapshotOrThrow\(App, seedUi, 'init:seed', 'UI boot seed snapshot'\)/,
    ],
    'boot bundle'
  );
  assertLacksAll(
    assert,
    bootBundle,
    [/App\.stateKernel\.installStoreReactivity\(/, /App\.stateKernel\.commitFromSnapshot\(/],
    'boot bundle'
  );

  assertMatchesAll(
    assert,
    canvasPickingBundle,
    [/moduleKey: `corner:\$\{cellIdx\}`/],
    'canvas picking bundle'
  );
  assertCallObjectContract(assert, canvasPickingBundle, 'commitCanvasModuleStructuralPatch', {
    argIndex: 0,
    requiredProperties: { moduleKey: true, mutate: true, meta: true },
    label: 'canvas structural patch',
    fileName: 'canvas_picking.bundle.ts',
  });
  assertCallObjectContract(assert, canvasPickingBundle, 'readCanvasModuleConfigForStack', {
    argIndex: 0,
    requiredProperties: { moduleKey: true },
    requiredIdentifiers: ['cellIdx'],
    label: 'corner module config read',
    fileName: 'canvas_picking.bundle.ts',
  });
  assertLacksAll(
    assert,
    canvasPickingBundle,
    [/getModulesActions\(App\)/, /mods\.patchForStack/, /mods\.ensureForStack/],
    'canvas picking bundle'
  );
  assertLacksAll(
    assert,
    canvasPickingBundle,
    [
      /sk\.patchModuleConfigForStack\(__activeStack, mk, patchFn, meta\)/,
      /sk\.patchModuleConfig\(mk, patchFn, meta\)/,
    ],
    'canvas picking bundle'
  );
});

test('[statekernel audit] kernel/config_write helper stays deleted and raw stateKernel writes stay out of ui/services trees', () => {
  assert.equal(fs.existsSync(CONFIG_WRITE_PATH), false);

  const WRITE_CALL_RE = /\bstateKernel\s*\.\s*(?:patch|set|apply|commit|persist|install)[A-Za-z0-9_]*\s*\(/g;
  for (const sub of ['ui', 'services']) {
    const dir = path.join(ROOT_DIR, sub);
    const files = walk(dir);
    const hits = [];
    for (const f of files) {
      const txt = fs.readFileSync(f, 'utf8');
      const matches = txt.match(WRITE_CALL_RE);
      if (matches && matches.length) hits.push({ file: rel(f), matches });
    }
    assert.deepEqual(hits, [], `${sub} tree should have no raw stateKernel write calls`);
  }
});

test('[statekernel audit] stateKernel references in esm/native stay constrained to explicit allowlist', () => {
  const required = [
    'kernel/kernel.ts',
    'kernel/kernel_project_capture.ts',
    'kernel/kernel_snapshot_store_system.ts',
    'kernel/kernel_snapshot_store_contracts.ts',
    'kernel/state_kernel_service.ts',
    'runtime/assert.ts',
  ].sort();

  const hits = walk(ROOT_DIR)
    .filter(f => fs.readFileSync(f, 'utf8').includes('stateKernel'))
    .map(rel)
    .sort();

  const missing = required.filter(f => !hits.includes(f));
  assert.deepEqual(missing, []);

  const requiredRules = {
    'kernel/kernel_project_capture.ts': {
      mustMatch: [
        /stateKernel: StateKernelLike \| null \| undefined;/,
        /args\.stateKernel && typeof args\.stateKernel\.captureConfig === 'function'/,
        /args\.stateKernel && typeof args\.stateKernel\.captureEditState === 'function'/,
      ],
      mustNotMatch: [/App\.stateKernel\./, /services\.stateKernel/],
    },
    'kernel/kernel_snapshot_store_system.ts': {
      mustMatch: [
        /const captureConfigFn = args\.stateKernel\?\.captureConfig;/,
        /typeof captureConfigFn === 'function' \? \(\) => captureConfigFn\(\) : null/,
      ],
      mustNotMatch: [/App\.stateKernel\./, /services\.stateKernel/],
    },
  };

  for (const req of required) {
    const rule = requiredRules[req];
    if (!rule) continue;
    const src = fs.readFileSync(path.join(ROOT_DIR, req), 'utf8');
    for (const re of rule.mustMatch) assert.match(src, re, `${req} should match ${re}`);
    for (const re of rule.mustNotMatch) assert.doesNotMatch(src, re, `${req} should not match ${re}`);
  }

  const extras = hits.filter(f => !required.includes(f));
  assert.deepEqual(extras, []);
});
