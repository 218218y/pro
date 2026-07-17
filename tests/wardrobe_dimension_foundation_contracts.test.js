import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies, collectNamedModuleExports } from '../tools/wp_layer_contract_support.mjs';

const FACADE_SPECIFIER = 'wardrobe_dimension_tokens_shared';
const APPROVED_FACADE_RATCHET = Object.freeze({
  'static-import': Object.freeze({ importers: 279, statements: 279 }),
  'static-re-export': Object.freeze({ importers: 2, statements: 3 }),
  'dynamic-import': Object.freeze({ importers: 0, statements: 0 }),
  'type-import': Object.freeze({ importers: 0, statements: 0 }),
  total: Object.freeze({ importers: 281, statements: 282 }),
});
const APPROVED_STACK_SPLIT_FACADE_SYMBOLS = Object.freeze([
  'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  'STACK_SPLIT_LOWER_DEPTH_MAX',
  'STACK_SPLIT_LOWER_DEPTH_MIN',
  'STACK_SPLIT_LOWER_DOORS_MAX',
  'STACK_SPLIT_LOWER_DOORS_MIN',
  'STACK_SPLIT_LOWER_HEIGHT_MIN',
  'STACK_SPLIT_LOWER_WIDTH_MAX',
  'STACK_SPLIT_LOWER_WIDTH_MIN',
  'STACK_SPLIT_MIN_TOP_HEIGHT',
  'STACK_SPLIT_SEAM_GAP_M',
]);
const APPROVED_STACK_SPLIT_FACADE_IMPORTS = Object.freeze({
  'esm/native/builder/build_flow_plan_inputs.ts': Object.freeze(['STACK_SPLIT_SEAM_GAP_M']),
  'esm/native/builder/build_stack_split_lower_setup.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
  'esm/native/data/preset_models_data.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
  'esm/native/features/library_preset/library_preset_flow_shared.ts': Object.freeze([
    'DEFAULT_STACK_SPLIT_LOWER_HEIGHT',
  ]),
  'esm/native/runtime/default_state.ts': Object.freeze(['DEFAULT_STACK_SPLIT_LOWER_HEIGHT']),
});
const APPROVED_STACK_SPLIT_FACADE_REEXPORTS = Object.freeze({
  'esm/native/runtime/api.ts': APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
});
const APPROVED_STACK_SPLIT_FACADE_WILDCARDS = Object.freeze([
  Object.freeze({
    file: 'esm/native/features/dimensions/index.ts',
    syntax: 'static-re-export',
  }),
]);
const CARCASS_SHELL_DIRECT_CONSUMERS = Object.freeze([
  'esm/native/builder/build_wardrobe_flow_context_carcass.ts',
  'esm/native/builder/carcass_pipeline.ts',
  'esm/native/builder/core_carcass_shell.ts',
  'esm/native/builder/corner_wing_carcass_shell_metrics.ts',
  'esm/native/builder/module_loop_pipeline_hex_cell.ts',
  'esm/native/builder/module_loop_pipeline_module_frame.ts',
  'esm/native/services/canvas_picking_interior_hover_layout_mode.ts',
]);
const CARCASS_INTERIOR_DIRECT_CONSUMERS = Object.freeze(['esm/native/builder/build_flow_plan.ts']);

function read(relativePath) {
  return fs.readFileSync(relativePath, 'utf8');
}

function walkSourceFiles(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(absolute, visit);
    } else if (/\.(?:js|mjs|ts|tsx)$/u.test(entry.name)) {
      visit(absolute);
    }
  }
}

function isStackSplitFacadeSymbol(symbol) {
  return symbol.startsWith('DEFAULT_STACK_SPLIT_') || symbol.startsWith('STACK_SPLIT_');
}

function normalizedSymbolUsage(usage) {
  return Object.fromEntries(
    [...usage.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, symbols]) => [file, [...symbols].sort()])
  );
}

function collectStackSplitFacadeUsage(sources) {
  const imports = new Map();
  const reexports = new Map();
  const wildcardDependencies = [];

  for (const [file, source] of sources) {
    if (!source.includes(FACADE_SPECIFIER)) continue;
    const relativeFile = file.replaceAll('\\', '/');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      if (dependency.importedSymbols.includes('*')) {
        wildcardDependencies.push({ file: relativeFile, syntax: dependency.syntax });
        continue;
      }
      const stackSymbols = dependency.importedSymbols.filter(isStackSplitFacadeSymbol);
      if (!stackSymbols.length) continue;
      const target = dependency.syntax === 'static-import' ? imports : reexports;
      if (!target.has(relativeFile)) target.set(relativeFile, new Set());
      for (const symbol of stackSymbols) target.get(relativeFile).add(symbol);
    }
  }

  return {
    imports: normalizedSymbolUsage(imports),
    reexports: normalizedSymbolUsage(reexports),
    wildcardDependencies,
  };
}

function diffApprovedSymbolUsage(actual, approved) {
  const unapproved = [];
  const stale = [];
  for (const [file, symbols] of Object.entries(actual)) {
    const approvedSymbols = new Set(approved[file] || []);
    for (const symbol of symbols) {
      if (!approvedSymbols.has(symbol)) unapproved.push({ file, symbol });
    }
  }
  for (const [file, symbols] of Object.entries(approved)) {
    const actualSymbols = new Set(actual[file] || []);
    for (const symbol of symbols) {
      if (!actualSymbols.has(symbol)) stale.push({ file, symbol, action: 'remove-from-allowlist' });
    }
  }
  return { unapproved, stale };
}

function assertApprovedSymbolUsage(actual, approved, label) {
  const diff = diffApprovedSymbolUsage(actual, approved);
  const proposal = {
    contract: label,
    reviewRequired: diff.unapproved.length > 0,
    approved,
    actual,
    unapproved: diff.unapproved,
    staleAllowlistEntries: diff.stale,
    proposedAllowlist:
      diff.unapproved.length === 0 && diff.stale.length > 0 ? Object.freeze({ ...actual }) : null,
  };
  assert.deepEqual(
    actual,
    approved,
    `${label} drifted; new Stack Split facade usage is review-blocked and stale entries must be removed:\n${JSON.stringify(proposal, null, 2)}`
  );
}

function assertApprovedStackSplitFacadeSymbols(actual) {
  assert.deepEqual(
    actual,
    APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
    `Stack Split facade symbol surface changed and requires review:\n${JSON.stringify({
      approved: APPROVED_STACK_SPLIT_FACADE_SYMBOLS,
      actual,
    })}`
  );
}

test('[dimension-foundation] focused owners hold units, defaults, limits, and stack-split policy', () => {
  const facade = read('esm/shared/wardrobe_dimension_tokens_shared.ts');
  const units = read('esm/shared/dimensions/units.ts');
  const defaults = read('esm/shared/dimensions/wardrobe_defaults.ts');
  const limits = read('esm/shared/dimensions/product_limits.ts');
  const stackSplitPolicy = read('esm/shared/dimensions/stack_split_policy.ts');
  const stackSplitRenderPolicy = read('esm/shared/dimensions/stack_split_render_policy.ts');
  const stackSplitFeature = read('esm/native/features/stack_split/stack_split.ts');
  const platformOverhang = read('esm/native/features/platform_overhang_support.ts');
  const decorativeSeparator = read('esm/native/builder/build_stack_split_decorative_separator.ts');
  const carcassShellPolicy = read('esm/shared/dimensions/carcass_shell_policy.ts');
  const carcassInteriorPolicy = read('esm/shared/dimensions/carcass_interior_policy.ts');

  assert.match(facade, /from '\.\/dimensions\/units\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/wardrobe_defaults\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/product_limits\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_render_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_shell_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/carcass_interior_policy\.js'/u);
  assert.doesNotMatch(facade, /export const WARDROBE_DEFAULTS =/u);
  assert.doesNotMatch(facade, /export const WARDROBE_LIMITS =/u);

  assert.match(units, /export type Millimeters/u);
  assert.match(units, /export type WorldUnits/u);
  assert.match(units, /export function centimetersToMeters\(/u);
  assert.match(defaults, /export const WARDROBE_DEFAULTS = Object\.freeze/u);
  assert.match(limits, /export const WARDROBE_LIMITS = Object\.freeze/u);
  assert.match(stackSplitPolicy, /export const STACK_SPLIT_POLICY = Object\.freeze/u);
  assert.match(stackSplitPolicy, /lowerHeightCm: centimeters\(60\)/u);
  assert.match(stackSplitPolicy, /gapM: meters\(0\.002\)/u);
  assert.match(stackSplitRenderPolicy, /visibleHeightM: meters\(0\.039\)/u);
  assert.match(stackSplitRenderPolicy, /stackSplitCentimetersToMeters/u);
  assert.match(carcassShellPolicy, /export const CARCASS_SHELL_DIMENSIONS = Object\.freeze/u);
  assert.match(carcassInteriorPolicy, /export const CARCASS_INTERIOR_DIMENSIONS = Object\.freeze/u);
  assert.match(carcassInteriorPolicy, /CARCASS_SHELL_DIMENSIONS\.internalBackInsetM/u);
  assert.doesNotMatch(facade, /export const CARCASS_(?:SHELL|INTERIOR)_DIMENSIONS =/u);

  assert.doesNotMatch(defaults, /stackSplit|decorativeSeparator/u);
  assert.doesNotMatch(limits, /wardrobe_defaults/u);
  assert.doesNotMatch(stackSplitFeature, /wardrobe_dimension_tokens_shared/u);
  assert.match(stackSplitFeature, /dimensions\/stack_split_policy\.js/u);
  assert.doesNotMatch(platformOverhang, /wardrobe_dimension_tokens_shared/u);
  assert.match(platformOverhang, /dimensions\/stack_split_render_policy\.js/u);
  assert.doesNotMatch(decorativeSeparator, /dimensions\/wardrobe_defaults\.js/u);
  assert.match(decorativeSeparator, /dimensions\/stack_split_render_policy\.js/u);

  assert.doesNotMatch(
    `${units}\n${defaults}\n${limits}\n${stackSplitPolicy}\n${stackSplitRenderPolicy}\n${carcassShellPolicy}\n${carcassInteriorPolicy}`,
    /wardrobe_dimension_tokens_shared/u
  );
});

test('[dimension-foundation] Stack Split facade symbols stay on an exact transition allowlist', () => {
  const sources = [];
  walkSourceFiles('esm', file => sources.push([file, read(file)]));
  const usage = collectStackSplitFacadeUsage(sources);
  const facadeExports = collectNamedModuleExports(
    'esm/shared/wardrobe_dimension_tokens_shared.ts',
    read('esm/shared/wardrobe_dimension_tokens_shared.ts')
  )
    .map(entry => entry.exportedName)
    .filter(isStackSplitFacadeSymbol)
    .sort();

  assert.deepEqual(
    usage.wildcardDependencies,
    APPROVED_STACK_SPLIT_FACADE_WILDCARDS,
    `Stack Split facade wildcard/dynamic usage changed and requires explicit public-API review: ${JSON.stringify(
      {
        approved: APPROVED_STACK_SPLIT_FACADE_WILDCARDS,
        actual: usage.wildcardDependencies,
      }
    )}`
  );
  assertApprovedSymbolUsage(
    usage.imports,
    APPROVED_STACK_SPLIT_FACADE_IMPORTS,
    'Stack Split facade consumer allowlist'
  );
  assertApprovedSymbolUsage(
    usage.reexports,
    APPROVED_STACK_SPLIT_FACADE_REEXPORTS,
    'Stack Split facade public re-export allowlist'
  );
  assertApprovedStackSplitFacadeSymbols(facadeExports);
});

test('[dimension-foundation] pure Carcass Shell and Interior consumers use focused owners', () => {
  const assertDirectOwner = (file, symbol, ownerSpecifier) => {
    const dependencies = analyzeModuleDependencies(file, read(file)).imports;
    assert.equal(
      dependencies.some(
        dependency =>
          dependency.specifier.endsWith(ownerSpecifier) && dependency.importedSymbols.includes(symbol)
      ),
      true,
      `${file} must import ${symbol} from ${ownerSpecifier}`
    );
    assert.equal(
      dependencies.some(
        dependency =>
          dependency.specifier.includes(FACADE_SPECIFIER) && dependency.importedSymbols.includes(symbol)
      ),
      false,
      `${file} must not route ${symbol} through the legacy facade`
    );
  };

  for (const file of CARCASS_SHELL_DIRECT_CONSUMERS) {
    assertDirectOwner(file, 'CARCASS_SHELL_DIMENSIONS', 'dimensions/carcass_shell_policy.js');
  }
  for (const file of CARCASS_INTERIOR_DIRECT_CONSUMERS) {
    assertDirectOwner(file, 'CARCASS_INTERIOR_DIMENSIONS', 'dimensions/carcass_interior_policy.js');
  }
});

test('[dimension-foundation] Stack Split facade guard detects new consumers, symbols, and stale exceptions', () => {
  const usage = collectStackSplitFacadeUsage([
    [
      'esm/native/builder/new_stack_consumer.ts',
      `import { STACK_SPLIT_SEAM_GAP_M } from '../../shared/wardrobe_dimension_tokens_shared.js';`,
    ],
  ]);
  assert.throws(
    () => assertApprovedSymbolUsage(usage.imports, {}, 'Stack Split facade fixture consumer allowlist'),
    /review-blocked/u
  );

  assert.throws(
    () =>
      assertApprovedSymbolUsage(
        {},
        { 'esm/native/builder/retired_consumer.ts': ['DEFAULT_STACK_SPLIT_LOWER_HEIGHT'] },
        'Stack Split facade fixture stale allowlist'
      ),
    /stale entries must be removed/u
  );

  const fixtureExports = collectNamedModuleExports(
    'fixture.ts',
    `export const STACK_SPLIT_NEW_FACADE_SYMBOL = 1;`
  )
    .map(entry => entry.exportedName)
    .filter(isStackSplitFacadeSymbol);
  assert.throws(() => assertApprovedStackSplitFacadeSymbols(fixtureExports), /requires review/u);
});

test('[dimension-foundation] legacy facade importer budget is decrease-only', () => {
  const buckets = Object.fromEntries(
    Object.keys(APPROVED_FACADE_RATCHET)
      .filter(key => key !== 'total')
      .map(key => [key, { importers: new Set(), statements: new Set() }])
  );
  const totalImporters = new Set();
  const totalStatements = new Set();

  walkSourceFiles('esm', file => {
    const source = read(file);
    if (!source.includes(FACADE_SPECIFIER)) return;
    const relativeFile = file.replaceAll('\\', '/');
    for (const dependency of analyzeModuleDependencies(file, source).imports) {
      if (!dependency.specifier.includes(FACADE_SPECIFIER)) continue;
      const bucket = buckets[dependency.syntax];
      assert.ok(bucket, `unclassified facade dependency syntax: ${String(dependency.syntax)}`);
      const statementKey = `${relativeFile}:${dependency.statementStart}`;
      bucket.importers.add(relativeFile);
      bucket.statements.add(statementKey);
      totalImporters.add(relativeFile);
      totalStatements.add(statementKey);
    }
  });

  const actual = Object.fromEntries(
    Object.entries(buckets).map(([key, bucket]) => [
      key,
      { importers: bucket.importers.size, statements: bucket.statements.size },
    ])
  );
  actual.total = { importers: totalImporters.size, statements: totalStatements.size };

  const growth = [];
  const reductions = [];
  for (const [category, approved] of Object.entries(APPROVED_FACADE_RATCHET)) {
    for (const metric of ['importers', 'statements']) {
      if (actual[category][metric] > approved[metric]) {
        growth.push({ category, metric, approved: approved[metric], actual: actual[category][metric] });
      } else if (actual[category][metric] < approved[metric]) {
        reductions.push({ category, metric, approved: approved[metric], actual: actual[category][metric] });
      }
    }
  }

  const proposal = {
    ratchet: 'decrease-only',
    reviewRequired: growth.length > 0,
    approved: APPROVED_FACADE_RATCHET,
    actual,
    growth,
    reductions,
    proposedRatchet: reductions.length > 0 && growth.length === 0 ? actual : null,
  };
  assert.deepEqual(
    actual,
    APPROVED_FACADE_RATCHET,
    `legacy dimension facade ratchet drifted; growth is review-blocked and reductions must ratchet the approved baseline:\n${JSON.stringify(proposal, null, 2)}`
  );
});
