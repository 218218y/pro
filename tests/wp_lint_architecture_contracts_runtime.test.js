import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_BASELINE_PATH,
  auditLintArchitectureSource,
  collectLintArchitectureReport,
  collectLintArchitectureViolations,
  getLintArchitectureBaselineCount,
  readLintArchitectureBaselineEntries,
} from '../tools/wp_lint_architecture_contracts.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-lint-architecture-contract-'));
}

function writeFixture(root, rel, source) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, source);
  return file;
}

function writeBaseline(root, entries) {
  const baselinePath = path.join(root, 'baseline.json');
  fs.writeFileSync(baselinePath, `${JSON.stringify({ entries }, null, 2)}\n`);
  return baselinePath;
}

test('lint architecture contracts block new restricted imports, globals, and App bag access', () => {
  const source = `
    import { read } from '../kernel/api.js';
    export function run(App) {
      window.alert('x');
      const { cache } = App;
      return App.maps || cache || read;
    }
  `;
  const failures = auditLintArchitectureSource('esm/native/ui/bad_contract_fixture.ts', source);
  assert.deepEqual(
    failures.map(failure => failure.rule),
    [
      'lint-architecture/no-restricted-imports:layer-boundary',
      'lint-architecture/no-restricted-globals',
      'lint-architecture/no-restricted-syntax:app-bag',
      'lint-architecture/no-restricted-syntax:app-bag',
    ]
  );
});

test('lint architecture contracts keep viewer measurement geometry behind capability DI', () => {
  const source = `
    import type { AppContainer } from '../../../types';
    import { getCamera } from '../runtime/render_access.js';
    export function resolve(App: AppContainer) {
      return getCamera(App);
    }
  `;
  const failures = auditLintArchitectureSource(
    'esm/native/services/viewer_measurement_tool_resolution.ts',
    source
  );
  assert.deepEqual(
    failures.map(failure => failure.rule),
    [
      'lint-architecture/capability-boundary:viewer-measurement-runtime',
      'lint-architecture/capability-boundary:viewer-measurement-app-container',
    ]
  );
});

test('lint architecture contracts keep carcass shell geometry on the canonical typed IR boundary', () => {
  const shellFailures = auditLintArchitectureSource(
    'esm/native/builder/core_carcass_shell.ts',
    `import type { MutableRecord } from './core_pure_shared.js';
     export const boards: MutableRecord[] = [];`
  );
  assert.deepEqual(
    shellFailures.map(failure => failure.rule),
    ['lint-architecture/typed-ir:carcass-shell']
  );

  const renderFailures = auditLintArchitectureSource(
    'esm/native/builder/render_carcass_ops.ts',
    `export function install(deps) { return deps.isBackPanelSeg; }`
  );
  assert.deepEqual(
    renderFailures.map(failure => failure.rule),
    ['lint-architecture/typed-ir:carcass-shell']
  );
});

test('lint architecture contracts keep corner cornice planners on plan-first typed IR', () => {
  const failures = auditLintArchitectureSource(
    'esm/native/builder/corner_wing_cornice_plan.ts',
    `export const leaked: UnknownRecord = {};`
  );
  assert.deepEqual(
    failures.map(failure => failure.rule),
    ['lint-architecture/typed-ir:corner-cornice']
  );
});

test('lint architecture contracts keep part-hover preview clients behind the typed protocol runtime', () => {
  const protocolFailures = auditLintArchitectureSource(
    'esm/native/services/canvas_picking_part_hover_preview_protocol.ts',
    `import type { AppContainer, UnknownRecord } from '../../../types';
     export type Bad = { App: AppContainer; payload: UnknownRecord };`
  );
  assert.deepEqual(
    protocolFailures.map(failure => failure.rule),
    ['lint-architecture/preview-protocol:part-hover', 'lint-architecture/preview-protocol:part-hover']
  );

  const clientFailures = auditLintArchitectureSource(
    'esm/native/services/canvas_picking_generic_paint_hover_flow.ts',
    `export function run(previewRo) { return previewRo.setSketchPlacementPreview; }`
  );
  assert.deepEqual(
    clientFailures.map(failure => failure.rule),
    ['lint-architecture/preview-protocol:part-hover']
  );
});

test('lint architecture contract has no unbaselined or stale violations in the current tree', () => {
  const report = collectLintArchitectureReport();
  assert.equal(report.unbaselinedViolations.length, 0);
  assert.equal(report.staleBaselineEntries.length, 0);
});

test('lint architecture baseline count matches the json baseline file', () => {
  const fileEntries = readLintArchitectureBaselineEntries(DEFAULT_BASELINE_PATH);
  assert.equal(getLintArchitectureBaselineCount(), fileEntries.length);
});

test('lint architecture contracts fail a new violation that is not in baseline', () => {
  const root = makeTempRoot();
  writeFixture(
    root,
    'esm/native/ui/new_violation.ts',
    `import { getCfg } from '../kernel/api.js';\nexport const value = getCfg;\n`
  );
  const baselinePath = writeBaseline(root, []);
  const report = collectLintArchitectureReport({ root, baselinePath });
  assert.equal(report.unbaselinedViolations.length, 1);
  assert.equal(collectLintArchitectureViolations({ root, baselinePath }).length, 1);
});

test('lint architecture contracts allow a violation only when it is explicitly baselined', () => {
  const root = makeTempRoot();
  writeFixture(
    root,
    'esm/native/ui/baselined_violation.ts',
    `import { getCfg } from '../kernel/api.js';\nexport const value = getCfg;\n`
  );
  const baselinePath = writeBaseline(root, [
    {
      rule: 'lint-architecture/no-restricted-imports:layer-boundary',
      file: 'esm/native/ui/baselined_violation.ts',
      message: 'ui modules must not import from kernel: ../kernel/api.js',
      reason: 'runtime test fixture',
    },
  ]);

  const report = collectLintArchitectureReport({ root, baselinePath });
  assert.equal(report.unbaselinedViolations.length, 0);
  assert.equal(report.baselinedViolations.length, 1);
  assert.equal(report.staleBaselineEntries.length, 0);
});

test('lint architecture contracts fail when a baseline entry is stale', () => {
  const root = makeTempRoot();
  writeFixture(root, 'esm/native/ui/no_violation.ts', `export const value = 1;\n`);
  const baselinePath = writeBaseline(root, [
    {
      rule: 'lint-architecture/no-restricted-imports:layer-boundary',
      file: 'esm/native/ui/no_violation.ts',
      message: 'ui modules must not import from kernel: ../kernel/api.js',
      reason: 'runtime test fixture',
    },
  ]);

  const report = collectLintArchitectureReport({ root, baselinePath });
  assert.equal(report.unbaselinedViolations.length, 0);
  assert.equal(report.baselinedViolations.length, 0);
  assert.equal(report.staleBaselineEntries.length, 1);
});

test('lint architecture baseline is loaded from json, not hardcoded in the tool', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tools/wp_lint_architecture_contracts.mjs'), 'utf8');
  assert.equal(source.includes('BASELINED_VIOLATIONS'), false);
  assert.equal(source.includes('esm/native/services/autosave_shared.ts'), false);
  assert.equal(source.includes('notes_overlay_editor_workflow_events.ts'), false);
});
