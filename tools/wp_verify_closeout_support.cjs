'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPORT_JSON_PATH = path.join('docs', 'FINAL_VERIFICATION_SUMMARY.json');
const REPORT_MD_PATH = path.join('docs', 'FINAL_VERIFICATION_SUMMARY.md');
const STATE_JSON_PATH = path.join('.artifacts', 'closeout-state.json');

const CLOSEOUT_LANES = [
  {
    id: 'build-dist',
    label: 'Build dist bundle',
    command: 'npm',
    args: ['run', 'build:dist'],
    category: 'build',
    expected: 'pass',
  },
  {
    id: 'perf-smoke',
    label: 'Perf smoke baseline',
    command: 'npm',
    args: ['run', 'perf:smoke'],
    category: 'perf',
    expected: 'pass',
  },
  {
    id: 'overlay-export-core',
    label: 'Overlay/export family core verify (direct)',
    category: 'verify',
    expected: 'pass',
    steps: [
      {
        label: 'overlay/export contracts',
        command: 'node',
        args: ['--test', 'tests/export_overlay_errors_family_contracts.test.js'],
      },
      { label: 'typecheck platform', command: 'tsc', args: ['-p', 'tsconfig.checkjs.platform.json'] },
      { label: 'typecheck services', command: 'tsc', args: ['-p', 'tsconfig.checkjs.services.json'] },
      { label: 'typecheck runtime', command: 'tsc', args: ['-p', 'tsconfig.checkjs.runtime.json'] },
      { label: 'layer contracts', command: 'node', args: ['tools/wp_layer_contract.js'] },
      { label: 'public api contracts', command: 'node', args: ['tools/wp_public_api_contract.js'] },
    ],
  },
  {
    id: 'order-pdf-overlay-core',
    label: 'Order PDF overlay core batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/order_pdf_overlay_controller_actions_runtime.test.ts',
      'tests/order_pdf_overlay_draft_action_feedback_runtime.test.ts',
      'tests/order_pdf_overlay_draft_commands_runtime.test.ts',
      'tests/order_pdf_overlay_draft_effects_runtime.test.ts',
      'tests/order_pdf_overlay_interactions_runtime.test.ts',
      'tests/order_pdf_overlay_runtime_export_runtime.test.ts',
      'tests/order_pdf_overlay_text_details_lines_runtime.test.ts',
      'tests/order_pdf_overlay_text_runtime.test.ts',
      'tests/order_pdf_text_details_merge_support_runtime.test.ts',
    ],
  },
  {
    id: 'order-pdf-pdf-render',
    label: 'Order PDF PDF-render batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/order_pdf_overlay_pdf_import_runtime.test.ts',
      'tests/order_pdf_overlay_pdf_render_canvas_runtime.test.ts',
      'tests/order_pdf_overlay_pdf_render_cleanup_runtime.test.ts',
      'tests/order_pdf_overlay_pdf_render_runtime.test.ts',
      'tests/order_pdf_image_pdf_text_layout_runtime.test.ts',
    ],
  },
  {
    id: 'order-pdf-sketch',
    label: 'Order PDF sketch batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/order_pdf_history_shortcuts_runtime.test.ts',
      'tests/order_pdf_sketch_draft_persistence_runtime.test.ts',
      'tests/order_pdf_sketch_palette_placement_runtime.test.ts',
      'tests/order_pdf_sketch_panel_runtime.test.ts',
      'tests/order_pdf_sketch_preview_session_runtime.test.ts',
      'tests/order_pdf_sketch_shortcuts_runtime.test.ts',
    ],
  },
  {
    id: 'order-pdf-export-overlay',
    label: 'Order PDF export overlay batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/order_pdf_overlay_export_ops_runtime.test.ts',
      'tests/order_pdf_overlay_export_commands_runtime.test.ts',
      'tests/order_pdf_overlay_export_singleflight_runtime.test.ts',
    ],
  },
  {
    id: 'order-pdf-export-builders',
    label: 'Order PDF export builders batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/export_order_pdf_builder_draft_runtime.test.ts',
      'tests/export_order_pdf_builder_runtime.test.ts',
      'tests/export_order_pdf_builder_sketch_annotations_runtime.test.ts',
    ],
  },
  {
    id: 'order-pdf-export-capture',
    label: 'Order PDF export capture batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/export_order_pdf_capture_cache_runtime.test.ts',
      'tests/export_order_pdf_capture_runtime.test.ts',
      'tests/export_order_pdf_ops_runtime.test.ts',
    ],
  },
  {
    id: 'order-pdf-export-text',
    label: 'Order PDF export text batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/export_order_pdf_sketch_annotations_runtime.test.ts',
      'tests/export_order_pdf_text_runtime.test.ts',
    ],
  },
  {
    id: 'sketch-manual-hover',
    label: 'Sketch manual/hover batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/sketch_manual_tool_host_runtime.test.ts',
      'tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts',
    ],
  },
  {
    id: 'sketch-box-hover',
    label: 'Sketch box/hover batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/canvas_picking_sketch_box_runtime_runtime.test.ts',
      'tests/canvas_picking_sketch_box_door_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_box_doors_runtime.test.ts',
      'tests/canvas_picking_sketch_box_overlap_runtime.test.ts',
      'tests/sketch_box_hover_click_runtime.test.ts',
      'tests/sketch_box_door_visuals_runtime.test.ts',
    ],
  },
  {
    id: 'sketch-free-boxes',
    label: 'Sketch free-box batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_commit_runtime.test.ts',
      'tests/sketch_free_boxes_attach_runtime.test.ts',
      'tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts',
      'tests/sketch_free_boxes_outside_attach_runtime.test.ts',
      'tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts',
      'tests/sketch_free_boxes_room_floor_runtime.test.ts',
    ],
  },
  {
    id: 'sketch-render-visuals',
    label: 'Sketch render/visuals batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/render_interior_sketch_visuals_runtime.test.ts',
      'tests/render_interior_sketch_fronts_runtime.test.ts',
      'tests/render_interior_sketch_layout_dimensions_runtime.test.ts',
      'tests/render_interior_sketch_layout_geometry_runtime.test.ts',
      'tests/sketch_front_visual_state_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-lifecycle',
    label: 'Cloud sync lifecycle batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_serial_tests.mjs',
      '--batch-size',
      '3',
      '--heartbeat-ms',
      '10000',
      '--timeout-ms',
      '120000',
      '--failed-files-path',
      '.artifacts/cloud-sync-surfaces.lifecycle.failed.txt',
      '--timings-path',
      '.artifacts/cloud-sync-surfaces.lifecycle.timings.json',
      'tests/cloud_sync_panel_actions_runtime.test.js',
      'tests/cloud_sync_action_feedback_runtime.test.ts',
      'tests/cloud_sync_access_runtime.test.ts',
      'tests/cloud_sync_install_support_runtime.test.ts',
      'tests/cloud_sync_lifecycle_install_cleanup_runtime.test.js',
      'tests/cloud_sync_actions_runtime.test.ts',
      'tests/cloud_sync_async_singleflight_owner_runtime.test.ts',
      'tests/cloud_sync_config_runtime.test.ts',
      'tests/cloud_sync_delete_temp_runtime.test.ts',
      'tests/cloud_sync_lifecycle_attention_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_runtime.test.ts',
      'tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-main-row',
    label: 'Cloud sync main-row batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_serial_tests.mjs',
      '--batch-size',
      '3',
      '--heartbeat-ms',
      '10000',
      '--timeout-ms',
      '120000',
      '--failed-files-path',
      '.artifacts/cloud-sync-surfaces.main-row.failed.txt',
      '--timings-path',
      '.artifacts/cloud-sync-surfaces.main-row.timings.json',
      'tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts',
      'tests/cloud_sync_main_row_runtime.test.ts',
      'tests/cloud_sync_main_write_singleflight_runtime.test.ts',
      'tests/cloud_sync_mutation_commands_runtime.test.ts',
      'tests/cloud_sync_mutation_commands_singleflight_runtime.test.ts',
      'tests/cloud_sync_owner_context_runtime.test.ts',
      'tests/cloud_sync_status_install_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-panel-install',
    label: 'Cloud sync panel-install batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_api_install_healing_runtime.test.ts',
      'tests/cloud_sync_panel_api_surface_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-panel-controller',
    label: 'Cloud sync panel-controller batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts',
      'tests/cloud_sync_panel_api_failures_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-panel-subscriptions',
    label: 'Cloud sync panel-subscriptions batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_api_singleflight_runtime.test.ts',
      'tests/cloud_sync_panel_api_subscriptions_runtime.test.ts',
      'tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-panel-snapshots',
    label: 'Cloud sync panel-snapshots batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_snapshot_controller_runtime.test.ts',
      'tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts',
      'tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-sync-ops',
    label: 'Cloud sync sync-ops batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_serial_tests.mjs',
      '--batch-size',
      '3',
      '--heartbeat-ms',
      '10000',
      '--timeout-ms',
      '120000',
      '--failed-files-path',
      '.artifacts/cloud-sync-surfaces.sync-ops.failed.txt',
      '--timings-path',
      '.artifacts/cloud-sync-surfaces.sync-ops.timings.json',
      'tests/cloud_sync_pull_coalescer_runtime.test.ts',
      'tests/cloud_sync_realtime_support_runtime.test.ts',
      'tests/cloud_sync_remote_push_singleflight_runtime.test.ts',
      'tests/cloud_sync_rest_runtime.test.ts',
      'tests/cloud_sync_room_commands_runtime.test.ts',
      'tests/cloud_sync_site2_sketch_behavior_runtime.test.ts',
      'tests/cloud_sync_sketch_ops_runtime.test.ts',
      'tests/cloud_sync_sketch_pull_load_runtime.test.ts',
      'tests/cloud_sync_support_runtime.test.ts',
    ],
  },
  {
    id: 'cloud-sync-tabs-ui',
    label: 'Cloud sync tabs-ui batch (direct)',
    category: 'verify',
    expected: 'pass',
    command: 'node',
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_sync_pin_command_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_command_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts',
      'tests/cloud_sync_ui_action_controller_runtime.test.js',
    ],
  },
  {
    id: 'e2e-list',
    label: 'Playwright smoke suite listing',
    command: 'npm',
    args: ['run', 'e2e:smoke:list'],
    category: 'e2e',
    expected: 'pass',
  },
  {
    id: 'e2e-preflight',
    label: 'Playwright browser preflight',
    command: 'npm',
    args: ['run', 'e2e:smoke:preflight'],
    category: 'e2e',
    expected: 'environment-ok',
  },
  {
    id: 'e2e-smoke-run',
    label: 'Playwright smoke run',
    command: 'npm',
    args: ['run', 'e2e:smoke'],
    category: 'e2e',
    expected: 'pass',
    dependsOn: ['e2e-preflight'],
  },
];

const CLOSEOUT_PROFILES = {
  default: CLOSEOUT_LANES.map(lane => lane.id),
  verify: CLOSEOUT_LANES.filter(lane => lane.category === 'verify').map(lane => lane.id),
  'verify-core': ['build-dist', 'perf-smoke', 'overlay-export-core'],
  'order-pdf': CLOSEOUT_LANES.filter(lane => lane.id.startsWith('order-pdf-')).map(lane => lane.id),
  sketch: CLOSEOUT_LANES.filter(lane => lane.id.startsWith('sketch-')).map(lane => lane.id),
  'cloud-sync': CLOSEOUT_LANES.filter(lane => lane.id.startsWith('cloud-sync-')).map(lane => lane.id),
  e2e: CLOSEOUT_LANES.filter(lane => lane.category === 'e2e').map(lane => lane.id),
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveStateFile(options = {}) {
  return options.stateFile || STATE_JSON_PATH;
}

function readJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readStatePayload(filePath) {
  const payload = readJsonFile(filePath);
  if (!payload || !Array.isArray(payload.results)) {
    return { generatedAt: null, workspace: process.cwd(), summary: summarize([]), results: [] };
  }
  return {
    generatedAt: payload.generatedAt || null,
    workspace: payload.workspace || process.cwd(),
    meta: payload.meta || {},
    summary: payload.summary || summarize(payload.results),
    results: payload.results,
  };
}

function mergeResults(existingResults, nextResults) {
  const byId = new Map();
  for (const result of existingResults || []) {
    if (result && result.id) byId.set(result.id, result);
  }
  for (const result of nextResults || []) {
    if (result && result.id) byId.set(result.id, result);
  }
  const ordered = [];
  for (const lane of CLOSEOUT_LANES) {
    if (byId.has(lane.id)) ordered.push(byId.get(lane.id));
    byId.delete(lane.id);
  }
  for (const leftover of byId.values()) ordered.push(leftover);
  return ordered;
}

function writeStatePayload(filePath, payload) {
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function trimOutput(text, maxChars = 5000) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 80)}\n...\n[trimmed ${text.length - maxChars} chars]`;
}

function classifyEnvironmentFailure(output) {
  const lower = String(output || '').toLowerCase();
  return (
    lower.includes('chromium') ||
    lower.includes('browser') ||
    lower.includes('playwright') ||
    lower.includes('eai_again') ||
    lower.includes('failed to download') ||
    lower.includes("executable doesn't exist") ||
    lower.includes('please run the following command to download new browsers')
  );
}

function classifyRunnerFailure(output) {
  const lower = String(output || '').toLowerCase();
  return (
    lower.includes('\neof') ||
    lower.startsWith('eof') ||
    lower.includes(' sigterm') ||
    lower.includes('\nsigterm') ||
    lower.includes('wrapper the wait') ||
    lower.includes('sandbox dropped')
  );
}

function normalizeCliArgs(argv) {
  const options = {
    laneIds: [],
    categories: [],
    profiles: [],
    skipLaneIds: [],
    resumeFrom: null,
    stopOnFail: argv.includes('--stop-on-fail'),
    shouldWrite: argv.includes('--write'),
    appendState: argv.includes('--append-state'),
    fromState: argv.includes('--from-state'),
    resetState: argv.includes('--reset-state'),
    logDir: null,
    stateFile: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--lane' && argv[i + 1]) options.laneIds.push(argv[i + 1]);
    if (token === '--category' && argv[i + 1]) options.categories.push(argv[i + 1]);
    if (token === '--profile' && argv[i + 1]) options.profiles.push(argv[i + 1]);
    if (token === '--skip' && argv[i + 1]) options.skipLaneIds.push(argv[i + 1]);
    if (token === '--resume-from' && argv[i + 1]) options.resumeFrom = argv[i + 1];
    if (token === '--log-dir' && argv[i + 1]) options.logDir = argv[i + 1];
    if (token === '--state-file' && argv[i + 1]) options.stateFile = argv[i + 1];
  }
  return options;
}

function selectLanes(lanes, options = {}) {
  const laneMap = new Map(lanes.map(lane => [lane.id, lane]));
  const selectedIds = [];

  function pushUnique(id) {
    if (!laneMap.has(id)) return;
    if (!selectedIds.includes(id)) selectedIds.push(id);
  }

  if (Array.isArray(options.profiles) && options.profiles.length > 0) {
    for (const profile of options.profiles) {
      for (const id of CLOSEOUT_PROFILES[profile] || []) pushUnique(id);
    }
  }

  if (Array.isArray(options.categories) && options.categories.length > 0) {
    for (const lane of lanes) {
      if (options.categories.includes(lane.category)) pushUnique(lane.id);
    }
  }

  if (Array.isArray(options.laneIds) && options.laneIds.length > 0) {
    for (const id of options.laneIds) pushUnique(id);
  }

  if (selectedIds.length === 0) {
    for (const lane of lanes) pushUnique(lane.id);
  }

  let filtered = selectedIds.map(id => laneMap.get(id)).filter(Boolean);

  if (options.resumeFrom) {
    const startIndex = filtered.findIndex(lane => lane.id === options.resumeFrom);
    if (startIndex >= 0) filtered = filtered.slice(startIndex);
  }

  if (Array.isArray(options.skipLaneIds) && options.skipLaneIds.length > 0) {
    filtered = filtered.filter(lane => !options.skipLaneIds.includes(lane.id));
  }

  return filtered;
}

function writeLaneLogs(logDir, laneResult) {
  if (!logDir) return;
  ensureDir(logDir);
  const safeId = laneResult.id.replace(/[^a-z0-9._-]+/gi, '_');
  const base = path.join(logDir, safeId);
  if (laneResult.stdout) fs.writeFileSync(`${base}.stdout.log`, `${laneResult.stdout}\n`, 'utf8');
  if (laneResult.stderr) fs.writeFileSync(`${base}.stderr.log`, `${laneResult.stderr}\n`, 'utf8');
  if (Array.isArray(laneResult.steps) && laneResult.steps.length > 0) {
    fs.writeFileSync(`${base}.steps.json`, `${JSON.stringify(laneResult.steps, null, 2)}\n`, 'utf8');
  }
}

function spawnCommand(command, args) {
  const startedAt = Date.now();
  const result = spawnSync(command, args || [], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
    maxBuffer: 1024 * 1024 * 16,
  });
  const durationMs = Date.now() - startedAt;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = `${stdout}\n${stderr}`;
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  return {
    exitCode,
    durationMs,
    startedAtIso: new Date(startedAt).toISOString(),
    finishedAtIso: nowIso(),
    stdout: trimOutput(stdout),
    stderr: trimOutput(stderr),
    combined,
  };
}

function findBlockingDependency(lane, priorResults = []) {
  if (!Array.isArray(lane.dependsOn) || lane.dependsOn.length === 0) return null;
  const byId = new Map((priorResults || []).filter(Boolean).map(result => [result.id, result]));
  for (const dependencyId of lane.dependsOn) {
    const dependency = byId.get(dependencyId);
    if (!dependency) return { id: dependencyId, status: 'failed', reason: 'missing-dependency-result' };
    if (dependency.status !== 'passed') return dependency;
  }
  return null;
}

function classifyStatus(expected, exitCode, combined) {
  if (exitCode === 0) return 'passed';
  if (expected === 'environment-ok' && classifyEnvironmentFailure(combined)) return 'environment-blocked';
  if (classifyRunnerFailure(combined)) return 'runner-blocked';
  return 'failed';
}

function runLane(lane, options = {}) {
  const startedAt = Date.now();
  const blockingDependency = findBlockingDependency(lane, options.priorResults || []);
  if (blockingDependency) {
    const blockedStatus =
      blockingDependency.status === 'environment-blocked'
        ? 'environment-blocked'
        : blockingDependency.status === 'runner-blocked'
          ? 'runner-blocked'
          : 'failed';
    const result = {
      ...lane,
      status: blockedStatus,
      exitCode: 1,
      durationMs: 0,
      startedAtIso: new Date(startedAt).toISOString(),
      finishedAtIso: nowIso(),
      stdout: '',
      stderr: `Skipped because dependency ${blockingDependency.id} resolved to ${blockingDependency.status}.`,
      blockedBy: blockingDependency.id,
    };
    writeLaneLogs(options.logDir, result);
    return result;
  }
  if (Array.isArray(lane.steps) && lane.steps.length > 0) {
    const steps = [];
    let status = 'passed';
    let exitCode = 0;
    for (const step of lane.steps) {
      const spawned = spawnCommand(step.command, step.args);
      const stepStatus = classifyStatus(lane.expected, spawned.exitCode, spawned.combined);
      steps.push({
        label: step.label,
        command: step.command,
        args: step.args || [],
        status: stepStatus,
        exitCode: spawned.exitCode,
        durationMs: spawned.durationMs,
        startedAtIso: spawned.startedAtIso,
        finishedAtIso: spawned.finishedAtIso,
        stdout: spawned.stdout,
        stderr: spawned.stderr,
      });
      if (stepStatus !== 'passed') {
        status = stepStatus;
        exitCode = spawned.exitCode;
        break;
      }
    }
    const result = {
      ...lane,
      status,
      exitCode,
      durationMs: Date.now() - startedAt,
      startedAtIso: new Date(startedAt).toISOString(),
      finishedAtIso: nowIso(),
      steps,
      stdout: '',
      stderr: '',
    };
    writeLaneLogs(options.logDir, result);
    return result;
  }
  const spawned = spawnCommand(lane.command, lane.args);
  const result = {
    ...lane,
    status: classifyStatus(lane.expected, spawned.exitCode, spawned.combined),
    exitCode: spawned.exitCode,
    durationMs: spawned.durationMs,
    startedAtIso: spawned.startedAtIso,
    finishedAtIso: spawned.finishedAtIso,
    stdout: spawned.stdout,
    stderr: spawned.stderr,
  };
  writeLaneLogs(options.logDir, result);
  return result;
}

function summarize(results) {
  const summary = { total: results.length, passed: 0, failed: 0, environmentBlocked: 0, runnerBlocked: 0 };
  for (const result of results) {
    if (result.status === 'passed') summary.passed += 1;
    else if (result.status === 'environment-blocked') summary.environmentBlocked += 1;
    else if (result.status === 'runner-blocked') summary.runnerBlocked += 1;
    else summary.failed += 1;
  }
  summary.ok = summary.failed === 0 && summary.runnerBlocked === 0;
  return summary;
}

function formatStatusIcon(status) {
  if (status === 'passed') return '✅';
  if (status === 'environment-blocked') return '⚠️';
  if (status === 'runner-blocked') return '🟡';
  return '❌';
}

function formatLaneResultMd(result) {
  const commandText = result.command ? [result.command, ...(result.args || [])].join(' ') : '(grouped steps)';
  const lines = [
    `### ${formatStatusIcon(result.status)} ${result.label}`,
    '',
    `- id: \`${result.id}\``,
    `- category: \`${result.category}\``,
    `- command: \`${commandText}\``,
    `- status: **${result.status}**`,
    `- exit code: \`${result.exitCode}\``,
    `- duration: \`${result.durationMs}ms\``,
  ];
  if (Array.isArray(result.steps) && result.steps.length > 0) {
    lines.push('', '#### steps', '');
    for (const step of result.steps) {
      lines.push(
        `- ${formatStatusIcon(step.status)} ${step.label}: \`${[step.command, ...(step.args || [])].join(' ')}\` (${step.status}, ${step.durationMs}ms)`
      );
    }
  }
  if (result.stderr) lines.push('', '#### stderr', '', '```text', result.stderr, '```');
  if (result.stdout) lines.push('', '#### stdout', '', '```text', result.stdout, '```');
  return lines.join('\n');
}

function buildMarkdownReport(payload) {
  const lines = [
    '# Final Verification Summary',
    '',
    `- generated_at: ${payload.generatedAt}`,
    `- workspace: \`${payload.workspace}\``,
    `- total lanes: **${payload.summary.total}**`,
    `- passed: **${payload.summary.passed}**`,
    `- environment-blocked: **${payload.summary.environmentBlocked}**`,
    `- runner-blocked: **${payload.summary.runnerBlocked}**`,
    `- failed: **${payload.summary.failed}**`,
  ];
  if (payload.meta) {
    lines.push(
      `- selected profiles: \`${(payload.meta.profiles || []).join(', ') || 'default'}\``,
      `- selected categories: \`${(payload.meta.categories || []).join(', ') || '(all)'}\``,
      `- selected lanes: \`${(payload.meta.laneIds || []).join(', ') || '(all)'}\``,
      `- skipped lanes: \`${(payload.meta.skipLaneIds || []).join(', ') || '(none)'}\``,
      `- resumed from: \`${payload.meta.resumeFrom || '(start)'}\``,
      `- state file: \`${payload.meta.stateFile || '(none)'}\``
    );
  }
  lines.push(
    '',
    '## Interpretation',
    '',
    payload.summary.failed === 0 && payload.summary.runnerBlocked === 0
      ? 'כל ה־lanes שנבחרו לריצת closeout עברו או נחסמו סביבתית בלבד. כלומר אין כאן כשל verify פעיל ברמת הקוד בתוך סט הסגירה הזה.'
      : payload.summary.failed > 0
        ? 'יש לפחות lane אחד שנכשל ברמת verify/command, ולכן הסגירה הזו עדיין לא מלאה.'
        : 'לא נצפה כשל קוד ישיר, אבל לפחות lane אחד נחסם ברמת runner/sandbox ולכן עדיין אין סגירה מלאה.',
    '',
    payload.summary.environmentBlocked > 0
      ? 'יש גם lane אחד לפחות שנחסם סביבתית; הוא לא נספר ככשל קוד, אבל כן נשאר פתוח לסביבה מלאה עם browser/רשת זמינים.'
      : 'לא זוהו חסימות סביבתיות בריצת closeout הזו.',
    '',
    payload.summary.runnerBlocked > 0
      ? 'יש גם lane אחד לפחות שנחסם ברמת wrapper/runner/sandbox. זה לא נספר ככשל קוד ישיר, אבל גם לא נסגר כמעבר אמיתי.'
      : 'לא זוהו חסימות runner בריצת closeout הזו.',
    '',
    '## Lane results',
    ''
  );
  for (const result of payload.results) lines.push(formatLaneResultMd(result), '');
  return lines.join('\n');
}

function writeReports(payload, reportPaths = {}) {
  const jsonPath = reportPaths.jsonPath || REPORT_JSON_PATH;
  const mdPath = reportPaths.mdPath || REPORT_MD_PATH;
  ensureDirFor(jsonPath);
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, `${buildMarkdownReport(payload)}\n`, 'utf8');
}

module.exports = {
  CLOSEOUT_LANES,
  CLOSEOUT_PROFILES,
  REPORT_JSON_PATH,
  REPORT_MD_PATH,
  STATE_JSON_PATH,
  buildMarkdownReport,
  classifyEnvironmentFailure,
  classifyRunnerFailure,
  normalizeCliArgs,
  runLane,
  selectLanes,
  readStatePayload,
  mergeResults,
  resolveStateFile,
  summarize,
  writeReports,
  writeStatePayload,
};
