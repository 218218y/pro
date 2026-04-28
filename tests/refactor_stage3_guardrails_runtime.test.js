import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function runNodeScript(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

test('project load uses migration owners for canonical UI and config snapshots', () => {
  const loader = readFileSync('esm/native/io/project_io_orchestrator_project_load.ts', 'utf8');
  assert.match(loader, /buildCanonicalProjectUiSnapshot/);
  assert.match(loader, /buildCanonicalProjectConfigSnapshot/);
  assert.doesNotMatch(loader, /buildProjectConfigSnapshot\(data\)/);
});

test('stage 3 guardrail scripts pass on the repository source tree', () => {
  runNodeScript('tools/wp_runtime_selector_policy_audit.mjs');
  runNodeScript('tools/wp_html_sink_audit.mjs');
  runNodeScript('tools/wp_css_style_audit.mjs');
  runNodeScript('tools/wp_builder_context_policy_audit.mjs');
});
