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

test('lint architecture contracts keep targeted Canvas capability cores container-free', () => {
  const alignmentFailures = auditLintArchitectureSource(
    'esm/native/services/canvas_picking_door_layout_alignment.ts',
    `import type { AppContainer } from '../../../types';
     import { getDoorRuntime } from '../runtime/doors_access.js';
     export function run(App: AppContainer) { return getDoorRuntime(App); }`
  );
  assert.deepEqual(
    alignmentFailures.map(failure => failure.rule),
    [
      'lint-architecture/capability-boundary:door-layout-alignment-runtime',
      'lint-architecture/capability-boundary:door-layout-alignment-app-container',
    ]
  );

  const freeBoxFailures = auditLintArchitectureSource(
    'esm/native/services/canvas_picking_cell_dims_free_box_hover.ts',
    `import type { AppContainer } from '../../../types';
     import { __wp_getViewportRoots } from './canvas_picking_projection_runtime.js';
     export function run(App: AppContainer) { return __wp_getViewportRoots(App); }`
  );
  assert.deepEqual(
    freeBoxFailures.map(failure => failure.rule),
    [
      'lint-architecture/capability-boundary:cell-dims-free-box-hover-runtime',
      'lint-architecture/capability-boundary:cell-dims-free-box-hover-app-container',
    ]
  );

  const sketchBoxDoorFailures = auditLintArchitectureSource(
    'esm/native/services/canvas_picking_door_sketch_box_edit.ts',
    `import type { AppContainer } from '../../../types';
     import { readRootState } from '../runtime/root_state_access.js';
     import { commitCanvasModuleStructuralPatch } from './canvas_picking_structural_commit.js';
     export function run(App: AppContainer) {
       readRootState(App);
       return commitCanvasModuleStructuralPatch;
     }`
  );
  assert.deepEqual(
    sketchBoxDoorFailures.map(failure => failure.rule),
    [
      'lint-architecture/capability-boundary:sketch-box-door-edit-runtime',
      'lint-architecture/capability-boundary:sketch-box-door-edit-runtime',
      'lint-architecture/capability-boundary:sketch-box-door-edit-app-container',
    ]
  );
});

test('lint architecture contracts keep viewer measurement flow and facade on the feature runtime boundary', () => {
  const flowFailures = auditLintArchitectureSource(
    'esm/native/services/viewer_measurement_tool_flow.ts',
    `import type { AppContainer } from '../../../types';
     import { getWardrobeGroup } from '../runtime/render_access.js';
     export function run(App: AppContainer) { return getWardrobeGroup(App); }`
  );
  assert.deepEqual(
    flowFailures.map(failure => failure.rule),
    [
      'lint-architecture/capability-boundary:viewer-measurement-runtime',
      'lint-architecture/capability-boundary:viewer-measurement-app-container',
    ]
  );

  const facadeFailures = auditLintArchitectureSource(
    'esm/native/services/viewer_measurement_tool.ts',
    `import { getWardrobeGroup } from '../runtime/render_access.js';
     export function run(App) { return getWardrobeGroup(App); }`
  );
  assert.deepEqual(
    facadeFailures.map(failure => failure.rule),
    ['lint-architecture/capability-boundary:viewer-measurement-facade-runtime']
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

test('lint architecture contracts keep removable-part semantics behind the canonical owner and Builder seam', () => {
  const directKeyFailures = auditLintArchitectureSource(
    'esm/native/builder/doors_state_utils.ts',
    `import { listCanonicalRemovedDoorLookupKeys } from '../../shared/removed_doors_map_keys_shared.js';`
  );
  assert.deepEqual(
    directKeyFailures.map(failure => failure.rule),
    ['lint-architecture/removable-parts:canonical-owner']
  );

  const directOwnerFailures = auditLintArchitectureSource(
    'esm/native/builder/handles_config_snapshot.ts',
    `import { captureRemovedPartsMapSnapshot } from '../../shared/removable_parts_shared.js';`
  );
  assert.deepEqual(
    directOwnerFailures.map(failure => failure.rule),
    ['lint-architecture/removable-parts:builder-seam']
  );

  const removedSideFailures = auditLintArchitectureSource(
    'esm/native/builder/removed_frame_side_construction_capabilities.ts',
    `import { hasRemovedHingedDoorInRange } from './doors_state_utils.js';`
  );
  assert.deepEqual(
    removedSideFailures.map(failure => failure.rule),
    ['lint-architecture/removable-parts:removed-side-capability']
  );

  const retiredOwnerFailures = auditLintArchitectureSource(
    'esm/native/features/part_identity/api.ts',
    `export * from '../removable_parts.js';`
  );
  assert.deepEqual(
    retiredOwnerFailures.map(failure => failure.rule),
    ['lint-architecture/removable-parts:retired-feature-owner']
  );
});

test('lint architecture contracts keep planar reflector lifecycle ownership separated', () => {
  const installFailures = auditLintArchitectureSource(
    'esm/native/runtime/planar_reflector_runtime.ts',
    `import { renderPlanarReflectorSurface } from './planar_reflector_render_pass.js';
     export function install() { return renderPlanarReflectorSurface; }`
  );
  assert.deepEqual(
    installFailures.map(failure => failure.rule),
    [
      'lint-architecture/planar-reflector:lifecycle-ownership',
      'lint-architecture/planar-reflector:lifecycle-ownership',
    ]
  );

  const renderPassFailures = auditLintArchitectureSource(
    'esm/native/runtime/planar_reflector_render_pass.ts',
    `export function read(mirror) { return mirror.userData.__wpPlanarReflector; }`
  );
  assert.deepEqual(
    renderPassFailures.map(failure => failure.rule),
    ['lint-architecture/planar-reflector:lifecycle-ownership']
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
