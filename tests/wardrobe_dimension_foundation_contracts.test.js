import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { analyzeModuleDependencies } from '../tools/wp_layer_contract_support.mjs';

const FACADE_SPECIFIER = 'wardrobe_dimension_tokens_shared';
const APPROVED_FACADE_RATCHET = Object.freeze({
  'static-import': Object.freeze({ importers: 287, statements: 287 }),
  'static-re-export': Object.freeze({ importers: 2, statements: 3 }),
  'dynamic-import': Object.freeze({ importers: 0, statements: 0 }),
  'type-import': Object.freeze({ importers: 0, statements: 0 }),
  total: Object.freeze({ importers: 289, statements: 290 }),
});

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

  assert.match(facade, /from '\.\/dimensions\/units\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/wardrobe_defaults\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/product_limits\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_policy\.js'/u);
  assert.match(facade, /from '\.\/dimensions\/stack_split_render_policy\.js'/u);
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

  assert.doesNotMatch(defaults, /stackSplit|decorativeSeparator/u);
  assert.doesNotMatch(limits, /wardrobe_defaults/u);
  assert.doesNotMatch(stackSplitFeature, /wardrobe_dimension_tokens_shared/u);
  assert.match(stackSplitFeature, /dimensions\/stack_split_policy\.js/u);
  assert.doesNotMatch(platformOverhang, /wardrobe_dimension_tokens_shared/u);
  assert.match(platformOverhang, /dimensions\/stack_split_render_policy\.js/u);
  assert.doesNotMatch(decorativeSeparator, /dimensions\/wardrobe_defaults\.js/u);
  assert.match(decorativeSeparator, /dimensions\/stack_split_render_policy\.js/u);

  assert.doesNotMatch(
    `${units}\n${defaults}\n${limits}\n${stackSplitPolicy}\n${stackSplitRenderPolicy}`,
    /wardrobe_dimension_tokens_shared/u
  );
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
