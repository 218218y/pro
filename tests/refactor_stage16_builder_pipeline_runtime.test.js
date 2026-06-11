import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage16 builder pipeline contract is wired and protects the context path', () => {
  execFileSync(process.execPath, ['tools/wp_builder_pipeline_contract.mjs'], { stdio: 'pipe' });

  const setup = read('esm/native/builder/build_wardrobe_flow_context_setup.ts');
  const normalizer = read('esm/native/builder/build_string_normalizer.ts');
  const resolver = read('esm/native/builder/builder_deps_resolver.ts');
  const pkg = JSON.parse(read('package.json'));

  assert.match(setup, /createBuildStringNormalizer/);
  assert.doesNotMatch(setup, /function fallbackToBuildString/);
  assert.match(normalizer, /export function normalizeBuildStringDefault/);
  assert.match(resolver, /ResolveBuilderDepsRequest/);
  assert.doesNotMatch(resolver, /args && args\./);
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:builder-pipeline-contract/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage16_builder_pipeline_runtime\.test\.js/
  );
});
