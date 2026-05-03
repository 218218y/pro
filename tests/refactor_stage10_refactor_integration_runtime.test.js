import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
  REFACTOR_STAGE_PROGRESS_MARKER,
  assertRefactorStageCatalogIsWellFormed,
} from '../tools/wp_refactor_stage_catalog.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function runNodeScript(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

test('stage 10 refactor integration audit is wired into guardrails and verify lane', () => {
  assert.match(pkg.scripts['check:refactor-guardrails'], /npm run check:refactor-integration/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:script-duplicates/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:legacy-fallbacks/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:refactor-guardrails/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run test:refactor-stage-guards/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage10_refactor_integration_runtime\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage42_legacy_fallback_inventory_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage43_perf_runtime_surface_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage44_scheduler_debug_stats_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage45_corner_connector_special_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage46_domain_api_shared_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage47_models_service_surface_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage48_preset_models_data_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage49_slice_write_dispatch_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage50_order_pdf_export_actions_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage51_scheduler_shared_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage52_interior_tab_helpers_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage53_room_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage54_render_preview_measurements_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage55_order_pdf_sketch_toolbar_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage56_order_pdf_text_layer_session_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage57_order_pdf_text_box_runtime_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage58_order_pdf_sketch_preview_controller_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage59_order_pdf_sketch_canvas_runtime_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage60_order_pdf_sketch_panel_controller_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage61_order_pdf_card_text_layer_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage62_order_pdf_sketch_preview_runtime_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage63_order_pdf_sketch_panel_measurement_hooks_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage64_order_pdf_sketch_panel_view_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage65_render_carcass_cornice_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage66_render_interior_sketch_shared_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage67_render_preview_marker_ownership_guard\.test\.js/
  );

  const verifyFlow = fs.readFileSync('tools/wp_verify_flow.js', 'utf8');
  const guardIndex = verifyFlow.indexOf("scriptName: 'check:refactor-guardrails'");
  const testIndex = verifyFlow.indexOf("scriptName: 'test'");
  assert.ok(guardIndex >= 0, 'verify flow should run refactor guardrails');
  assert.ok(testIndex > guardIndex, 'refactor guardrails should run before the general test suite');
});

test('stage 10 refactor integration audit covers guardrails, stage tests, verify flow and progress docs', () => {
  const audit = fs.readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  for (const expected of [
    'requiredGuardScripts',
    'requiredStageGuardTests',
    'verify:refactor-modernization',
    'tools/wp_verify_flow.js',
    'REFACTOR_STAGE_PROGRESS_MARKER',
    'REFACTOR_COMPLETED_STAGE_LABELS',
    'REFACTOR_INTEGRATION_ANCHORS',
  ]) {
    assert.ok(audit.includes(expected), `audit should include ${expected}`);
  }

  assert.equal(REFACTOR_STAGE_PROGRESS_MARKER.file, 'docs/REFACTOR_WORKMAP_PROGRESS.md');
  assert.equal(REFACTOR_STAGE_PROGRESS_MARKER.verifyEntryPoint, 'verify:refactor-modernization');
});

test('stage 39 to 41 refactor control-plane stage catalog is anchored', () => {
  assert.equal(assertRefactorStageCatalogIsWellFormed(), true);
  assert.equal(REFACTOR_COMPLETED_STAGE_LABELS.at(0), 'Stage 0');
  assert.equal(REFACTOR_COMPLETED_STAGE_LABELS.at(-1), `Stage ${REFACTOR_COMPLETED_STAGE_LABELS.length - 1}`);
  assert.equal(new Set(REFACTOR_COMPLETED_STAGE_LABELS).size, REFACTOR_COMPLETED_STAGE_LABELS.length);

  const progress = fs.readFileSync(REFACTOR_STAGE_PROGRESS_MARKER.file, 'utf8');
  for (const stage of REFACTOR_COMPLETED_STAGE_LABELS) {
    assert.match(progress, new RegExp(`${stage.replace(' ', '\\s+')}\\b`));
  }

  const audit = fs.readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  assert.match(audit, /REFACTOR_COMPLETED_STAGE_LABELS/);
  assert.match(audit, /REFACTOR_INTEGRATION_ANCHORS/);
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 39 to 41 refactor control-plane stage catalog is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 42 legacy fallback inventory closeout is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 43 perf runtime ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 44 scheduler debug stats ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 45 corner connector special interior ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 46 domain API shared ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 47 models service surface ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 48 preset models data ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 49 slice write dispatch ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 50 order pdf export actions ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 51 scheduler shared ownership split is anchored')
    )
  );

  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 52 interior tab helpers ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 53 room ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 54 render preview sketch measurements ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 55 order pdf sketch toolbar ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 56 order pdf text layer session ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 57 order pdf text box runtime ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 58 order pdf sketch preview controller ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 59 order pdf sketch canvas runtime ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 60 order pdf sketch panel controller ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 61 order pdf card text layer ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 62 order pdf sketch preview runtime ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 63 order pdf sketch panel measurement hooks ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 64 order pdf sketch panel view ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 65 render carcass cornice ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 66 render interior sketch shared ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 67 render preview marker ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 68 render preview sketch placement ops ownership split is anchored')
    )
  );

  runNodeScript('tools/wp_refactor_integration_audit.mjs');
});
