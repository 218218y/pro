import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(entryFile, overrides = Object.create(null)) {
  const cache = new Map();

  const load = file => {
    const normalizedFile = path.resolve(file);
    if (cache.has(normalizedFile)) return cache.get(normalizedFile).exports;

    const source = fs.readFileSync(normalizedFile, 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: normalizedFile,
    }).outputText;

    const mod = { exports: {} };
    cache.set(normalizedFile, mod);

    const localRequire = specifier => {
      if (specifier in overrides) return overrides[specifier];
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(normalizedFile), specifier);
        const candidates = [resolved, resolved.replace(/\.js$/i, '.ts'), `${resolved}.ts`];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return load(candidate);
        }
      }
      return require(specifier);
    };

    const sandbox = {
      module: mod,
      exports: mod.exports,
      require: localRequire,
      __dirname: path.dirname(normalizedFile),
      __filename: normalizedFile,
      console,
      process,
      Math,
      Date,
      Set,
      Object,
      Array,
      Number,
      String,
    };
    vm.runInNewContext(transpiled, sandbox, { filename: normalizedFile });
    return mod.exports;
  };

  return load(entryFile);
}

function loadDoorTrimModule() {
  return loadTsModule(path.join(process.cwd(), 'esm/native/features/door_trim.ts'), {
    './mirror_layout.js': {
      readMirrorLayoutList: () => [],
      resolveMirrorPlacementListInRect: () => [],
    },
  });
}

test('[corner-door-trim] scoped/full lookup survives lower-stack and canonical full keys', () => {
  const doorTrim = loadDoorTrimModule();
  assert.equal(typeof doorTrim.readDoorTrimListForPart, 'function');

  const scopedOnly = doorTrim.readDoorTrimListForPart({
    map: {
      lower_corner_door_1_full: [{ id: 't1', axis: 'horizontal', color: 'gold', span: 'half' }],
    },
    partId: 'corner_door_1_full',
    scopedPartId: 'lower_corner_door_1_full',
    preferScopedOnly: true,
  });
  assert.equal(scopedOnly.length, 1);
  assert.equal(scopedOnly[0].color, 'gold');
  assert.equal(scopedOnly[0].axis, 'horizontal');

  const canonicalFull = doorTrim.readDoorTrimListForPart({
    map: {
      corner_pent_door_2_full: [{ id: 't2', axis: 'vertical', color: 'black', span: 'third' }],
    },
    partId: 'corner_pent_door_2',
  });
  assert.equal(canonicalFull.length, 1);
  assert.equal(canonicalFull[0].color, 'black');
  assert.equal(canonicalFull[0].axis, 'vertical');
});

test('[corner-door-trim] preferScopedOnly never falls back from lower-stack ids to upper-stack trim entries', () => {
  const doorTrim = loadDoorTrimModule();

  const leaked = doorTrim.readDoorTrimListForPart({
    map: {
      corner_door_1_full: [{ id: 'top-1', axis: 'horizontal', color: 'gold', span: 'half' }],
    },
    partId: 'corner_door_1_full',
    scopedPartId: 'lower_corner_door_1_full',
    preferScopedOnly: true,
  });
  assert.equal(leaked.length, 0);

  const leakedBase = doorTrim.readDoorTrimListForPart({
    map: {
      corner_pent_door_2: [{ id: 'top-2', axis: 'vertical', color: 'black', span: 'third' }],
      corner_pent_door_2_full: [{ id: 'top-2f', axis: 'vertical', color: 'silver', span: 'quarter' }],
    },
    partId: 'corner_pent_door_2',
    scopedPartId: 'lower_corner_pent_door_2',
    preferScopedOnly: true,
  });
  assert.equal(leakedBase.length, 0);
});

test('[corner-door-trim] corner builders and picking keep lower-stack trim state scoped', () => {
  const wing = [
    'esm/native/builder/corner_wing_cell_doors.ts',
    'esm/native/builder/corner_wing_cell_doors_shared.ts',
    'esm/native/builder/corner_wing_cell_doors_contracts.ts',
    'esm/native/builder/corner_wing_cell_doors_context.ts',
    'esm/native/builder/corner_wing_cell_doors_scope.ts',
    'esm/native/builder/corner_wing_cell_doors_state.ts',
    'esm/native/builder/corner_wing_cell_doors_rendering.ts',
    'esm/native/builder/corner_wing_cell_doors_split_policy.ts',
  ]
    .map(rel => fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))
    .join('\n');
  const connector = [
    'esm/native/builder/corner_connector_door_emit.ts',
    'esm/native/builder/corner_connector_door_emit_shared.ts',
    'esm/native/builder/corner_connector_door_emit_policy.ts',
    'esm/native/builder/corner_connector_door_emit_visuals.ts',
    'esm/native/builder/corner_connector_door_emit_split.ts',
    'esm/native/builder/corner_connector_door_emit_full.ts',
  ]
    .map(rel => fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))
    .join('\n');
  const targets = fs.readFileSync(
    path.join(process.cwd(), 'esm/native/services/canvas_picking_door_trim_targets.ts'),
    'utf8'
  );

  assert.match(wing, /readDoorTrimListForPart\(/);
  assert.match(wing, /scopedPartId: ctx\.stackKey === 'bottom' \? ctx\.stackScopePartKey\(id\) : id,/);

  assert.match(connector, /readDoorTrimListForPart\(/);
  assert.match(
    connector,
    /scopedPartId: ctx\.stackKey === 'bottom' \? ctx\.stackScopePartKey\(partId\) : partId,/
  );
  assert.match(connector, /__wpStack: ctx\.stackKey,/);

  assert.match(targets, /function readGroupStackKey\(/);
  assert.match(targets, /function scopeCornerPartIdForBottom\(/);
  assert.match(targets, /const fallbackPartId = normalizeDoorTrimMapPartId\(candidatePartId, group\);/);
});
