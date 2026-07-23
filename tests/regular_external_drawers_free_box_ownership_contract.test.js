import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const consumerRel = 'esm/native/services/canvas_picking_regular_ext_drawers_free_box.ts';
const facadeRel = 'esm/shared/wardrobe_dimension_tokens_shared.ts';
const externalOwnerRel = 'esm/shared/dimensions/external_drawer_policy.ts';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const semanticSha256 = value => createHash('sha256').update(stableJson(value)).digest('hex');

function listSourceFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(absolute));
    else if (entry.isFile() && /\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) files.push(absolute);
  }
  return files;
}

const expectedEntries = Object.freeze([
  {
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: externalOwnerRel,
      kind: 'value',
      importedSymbols: ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/drawer_sketch_policy.ts',
      kind: 'value',
      importedSymbols: ['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The regular external-drawer free-box hover flow replaces one legacy facade statement with focused External Drawer size and front-render owners plus the focused Drawer Sketch External Preview owner on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed regular external-drawer free-box preview composition seam eliminates the extra Drawer Sketch statement without reintroducing the legacy facade.',
  },
  {
    from: 'services',
    to: 'shared',
    additionalStatements: 1,
    owner: 'dimension-ownership-migration',
    reviewedAt: '2026-07-23',
    reviewBy: '2026-10-18',
    fromFile: consumerRel,
    companionImport: {
      toFile: externalOwnerRel,
      kind: 'value',
      importedSymbols: ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
      syntax: 'static-import',
    },
    removedImport: {
      toFile: facadeRel,
      kind: 'value',
      importedSymbols: ['DRAWER_DIMENSIONS', 'MATERIAL_DIMENSIONS'],
      syntax: 'static-import',
    },
    addedImport: {
      toFile: 'esm/shared/dimensions/material_thickness_policy.ts',
      kind: 'value',
      importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      syntax: 'static-import',
    },
    reason:
      'The regular external-drawer free-box hover flow replaces one legacy facade statement with focused External Drawer size and front-render owners plus the canonical Material Thickness owner on the existing services to shared edge.',
    removalCondition:
      'Remove this entry when a reviewed regular external-drawer free-box preview composition seam eliminates the extra Material Thickness statement without reintroducing the legacy facade.',
  },
]);

test('regular external-drawer free-box hover imports exactly three focused owners without aliases', () => {
  const source = read(consumerRel);
  const analysis = analyzeModuleDependencies(path.join(root, consumerRel), source);
  const focusedImports = analysis.imports.filter(dependency => dependency.specifier.includes('/dimensions/'));

  assert.deepEqual(
    focusedImports.map(({ specifier, kind, syntax, importedSymbols }) => ({
      specifier,
      kind,
      syntax,
      importedSymbols,
    })),
    [
      {
        specifier: '../../shared/dimensions/drawer_sketch_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/external_drawer_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['EXTERNAL_DRAWER_FRONT_RENDER_POLICY', 'EXTERNAL_DRAWER_SIZE_POLICY'],
      },
      {
        specifier: '../../shared/dimensions/material_thickness_policy.js',
        kind: 'value',
        syntax: 'static-import',
        importedSymbols: ['MATERIAL_THICKNESS_POLICY'],
      },
    ]
  );
  assert.equal(focusedImports.length, 3);
  assert.equal(
    focusedImports.every(dependency =>
      dependency.bindings.every(binding => binding.importedName === binding.localName)
    ),
    true
  );
  assert.deepEqual(analysis.unresolvedDynamicImports, []);
  assert.deepEqual(analysis.forbiddenModuleSyntax, []);
  assert.doesNotMatch(source, /wardrobe_dimension_tokens_shared/u);
  assert.doesNotMatch(
    source,
    /\b(?:DRAWER_DIMENSIONS|MATERIAL_DIMENSIONS|DRAWER_SKETCH_POLICY|EXTERNAL_DRAWER_POLICY|drawerDims|externalDims|previewDims|materialDims)\b|import\s+\*\s+as/u
  );
});

test('regular external-drawer free-box preview keeps focused sizing and geometry formulas', () => {
  const source = read(consumerRel);
  assert.match(source, /const woodThick = MATERIAL_THICKNESS_POLICY\.wood\.thicknessM;/u);
  assert.match(source, /drawerHeightM: EXTERNAL_DRAWER_SIZE_POLICY\.regularHeightM/u);
  assert.match(source, /const regH = EXTERNAL_DRAWER_SIZE_POLICY\.regularHeightM;/u);
  assert.match(source, /const shoeH = EXTERNAL_DRAWER_SIZE_POLICY\.shoeHeightM;/u);
  assert.match(
    source,
    /Math\.max\(\s*DRAWER_SKETCH_EXTERNAL_PREVIEW_POLICY\.externalPreviewVisualMinWidthM,\s*faceWidth - EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualWidthClearanceM\s*\)/u
  );
  assert.match(
    source,
    /ctx\.frontOverlay\s*\?\s*ctx\.frontOverlay\.d\s*:\s*EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualThicknessM/u
  );
  assert.match(source, /EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.frontOffsetZM/u);
  assert.match(source, /EXTERNAL_DRAWER_FRONT_RENDER_POLICY\.visualHeightClearanceM/u);
});

test('regular external-drawer free-box migration appends exactly entries 121-122', () => {
  const baseline = JSON.parse(read('tools/wp_layer_baseline.json'));
  assert.ok(baseline.migrationBudgets.length >= 122);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 120)),
    '40c8812b78771efc64e38c69b919ace57a104dabfd1cd79882decbd317d9e170'
  );
  assert.deepEqual(baseline.migrationBudgets.slice(120, 122), expectedEntries);
  assert.equal(
    semanticSha256(baseline.migrationBudgets.slice(0, 122)),
    '60b9ef2947cfea12ddc16423ead76437ff6db645889aed2818e41f6733f9a112'
  );
});

test('regular external-drawer free-box migration leaves only the approved legacy field consumers', () => {
  const facadeDependencies = listSourceFiles(path.join(root, 'esm')).flatMap(file =>
    analyzeModuleDependencies(file, fs.readFileSync(file, 'utf8'))
      .imports.filter(dependency => dependency.specifier.includes('wardrobe_dimension_tokens_shared'))
      .map(dependency => ({
        file: path.relative(root, file).replaceAll('\\', '/'),
        ...dependency,
      }))
  );

  assert.deepEqual(
    facadeDependencies
      .filter(dependency => dependency.importedSymbols.includes('DRAWER_DIMENSIONS'))
      .map(dependency => dependency.file)
      .sort(),
    [
      'esm/native/builder/post_build_sketch_door_cuts_apply.ts',
      'esm/native/builder/render_drawer_ops_internal.ts',
    ]
  );
  assert.deepEqual(
    facadeDependencies
      .filter(dependency => dependency.importedSymbols.includes('MATERIAL_DIMENSIONS'))
      .map(dependency => dependency.file)
      .sort(),
    [
      'esm/native/builder/core_carcass_shared.ts',
      'esm/native/builder/core_doors_compute.ts',
      'esm/native/builder/core_layout_compute.ts',
    ]
  );
});
