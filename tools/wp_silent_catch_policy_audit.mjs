#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAstParserModule } from './wp_ast_adapter.mjs';

const SOURCE_ROOTS = ['esm/native', 'esm/boot'];
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const EXPECTED_STATEMENT_FREE_CATCHES_BY_LAYER = Object.freeze({
  adapters: 16,
  boot: 3,
  builder: 119,
  features: 12,
  io: 4,
  kernel: 9,
  platform: 38,
  runtime: 82,
  services: 84,
  ui: 158,
});
const EXPECTED_BARE_CATCHES_BY_LAYER = Object.freeze({
  adapters: 0,
  boot: 0,
  builder: 0,
  features: 0,
  io: 0,
  kernel: 0,
  platform: 0,
  runtime: 0,
  services: 0,
  ui: 0,
});
const EXPECTED_VAGUE_CATCH_COMMENTS_BY_LAYER = Object.freeze({
  adapters: 0,
  boot: 0,
  builder: 0,
  features: 0,
  io: 0,
  kernel: 0,
  platform: 0,
  runtime: 0,
  services: 0,
  ui: 0,
});
const FUNCTIONAL_OWNERS_WITHOUT_SILENT_CATCHES = Object.freeze([
  'esm/native/services/camera_access.ts',
  'esm/native/services/camera_motion.ts',
  'esm/native/services/camera_runtime.ts',
  'esm/native/services/camera_shared.ts',
  'esm/native/services/config_compounds.ts',
  'esm/native/services/config_compounds_runtime.ts',
  'esm/native/services/config_compounds_seed.ts',
  'esm/native/services/config_compounds_shared.ts',
  'esm/native/services/boot_finalizers.ts',
  'esm/native/services/boot_seeds_part02_colors.ts',
  'esm/native/services/boot_seeds_part02_flags.ts',
  'esm/native/services/boot_seeds_part02_runtime.ts',
  'esm/native/services/autosave_runtime.ts',
  'esm/native/services/autosave_schedule.ts',
  'esm/native/services/autosave_shared.ts',
  'esm/native/services/autosave_snapshot.ts',
  'esm/native/services/history_runtime.ts',
  'esm/native/services/history_schedule.ts',
  'esm/native/services/history_shared.ts',
  'esm/native/services/models_registry_nonfatal.ts',
  'esm/native/services/models_registry_normalization.ts',
  'esm/native/services/models_registry_pdf_draft.ts',
  'esm/native/services/models_registry_storage_persistence.ts',
  'esm/native/services/models_registry_storage_state.ts',
  'esm/native/services/models_collections_transaction.ts',
  'esm/native/services/edit_state_observability.ts',
  'esm/native/services/edit_state_reset.ts',
  'esm/native/services/edit_state_runtime.ts',
  'esm/native/services/edit_state_shared.ts',
  'esm/native/services/edit_state_sync.ts',
  'esm/native/runtime/edit_state_access.ts',
  'esm/native/runtime/dimension_sync_coalescer.ts',
  'esm/native/services/cloud_sync_conflict_store.ts',
  'esm/native/services/cloud_sync_install_lifecycle_runtime.ts',
  'esm/native/services/cloud_sync_main_row_pull_runtime.ts',
  'esm/native/services/cloud_sync_main_row_remote_pull.ts',
  'esm/native/services/cloud_sync_owner_context_status_publication_runtime.ts',
  'esm/native/services/canvas_picking_paint_flow_apply_commit.ts',
  'esm/native/services/canvas_picking_structural_commit.ts',
  'esm/native/services/canvas_picking_click_module_refs.ts',
  'esm/native/services/canvas_picking_sketch_free_commit.ts',
  'esm/native/services/canvas_picking_manual_layout_free_box_commit.ts',
  'esm/native/services/canvas_picking_cell_dims_free_box.ts',
  'esm/native/services/canvas_picking_door_sketch_box_edit.ts',
  'esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts',
  'esm/native/ui/notes_service_shared.ts',
  'esm/native/ui/notes_service_runtime.ts',
  'esm/native/ui/react/actions/builder_actions.ts',
  'esm/native/ui/react/actions/interactive_actions.ts',
  'esm/native/ui/react/actions/room_actions.ts',
  'esm/native/ui/react/actions/store_actions_runtime.ts',
  'esm/native/ui/react/tabs/interior_tab_workflows_controller_manual.ts',
  'esm/native/ui/react/tabs/interior_tab_workflows_controller_shared.ts',
  'esm/native/ui/react/tabs/settings_visual_display_controller_runtime.ts',
  'esm/native/ui/react/tabs/settings_visual_shared_interactions.ts',
  'esm/native/ui/multicolor_service.ts',
  'esm/native/ui/modes.ts',
  'esm/native/services/canvas_picking_toggle_flow_sketch_free_box.ts',
  'esm/native/services/canvas_picking_sketch_direct_hit_workflow_shelf.ts',
  'esm/native/services/canvas_picking_sketch_direct_hit_workflow_drawer.ts',
  'esm/native/services/canvas_picking_click_manual_sketch_free_flow.ts',
  'esm/native/services/canvas_picking_manual_layout_sketch_hover_tools_router.ts',
  'esm/native/runtime/app_helpers.ts',
  'esm/native/platform/boot_main.ts',
  'esm/native/platform/render_scheduler.ts',
  'esm/native/ui/boot_main.ts',
  'esm/native/ui/react/actions/modes_actions.ts',
  'esm/native/kernel/state_api_history_namespace.ts',
  'esm/native/kernel/state_api_meta_namespace.ts',
  'esm/boot/boot_manifest_shared.ts',
  'esm/native/ui/react/actions/sketch_actions.ts',
  'esm/native/runtime/doors_access_doors.ts',
  'esm/native/runtime/render_access_state_runtime.ts',
  'esm/native/runtime/render_access_surface.ts',
  'esm/native/runtime/boot_entry_access.ts',
  'esm/native/runtime/internal_state.ts',
  'esm/native/runtime/doors_access_services.ts',
  'esm/native/runtime/cache_access.ts',
  'esm/native/ui/react/actions/interior_actions.ts',
]);

function parserLanguage(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.tsx') return 'tsx';
  if (extension === '.ts') return 'ts';
  return 'js';
}

function parseSource(file, source) {
  const { parseSync } = getAstParserModule();
  const result = parseSync(file, String(source || ''), {
    astType: 'ts',
    lang: parserLanguage(file),
    preserveParens: true,
    showSemanticErrors: false,
    sourceType: 'unambiguous',
  });
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    const details = result.errors.map(error => String(error?.message || error)).join('; ');
    throw new Error(`${file}: AST parse failed: ${details}`);
  }
  return result.program;
}

function walkAst(node, visit, seen = new WeakSet()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (typeof node.type === 'string') visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent' || key === 'type') continue;
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && typeof child.type === 'string') {
          walkAst(child, visit, seen);
        }
      }
    } else if (value && typeof value === 'object' && typeof value.type === 'string') {
      walkAst(value, visit, seen);
    }
  }
}

function collectStatementFreeCatches(source, file) {
  const catches = [];
  walkAst(parseSource(file, source), node => {
    if (node.type !== 'CatchClause') return;
    if (node.body?.type !== 'BlockStatement' || !Array.isArray(node.body.body) || node.body.body.length > 0) {
      return;
    }
    const bodyText = String(source || '')
      .slice(node.body.start + 1, node.body.end - 1)
      .trim();
    const normalizedComment = bodyText
      .replace(/^\/\*+\s*/, '')
      .replace(/\s*\*\/$/, '')
      .replace(/^\/\/\s*/, '')
      .trim()
      .toLowerCase();
    catches.push({
      bare: bodyText.length === 0,
      vague: normalizedComment === 'ignore' || normalizedComment === 'swallow',
    });
  });
  return catches;
}

export function countEmptyCatchesInSource(source, file = 'source.ts') {
  const catches = collectStatementFreeCatches(source, file);
  return {
    statementFree: catches.length,
    bare: catches.filter(entry => entry.bare).length,
    vague: catches.filter(entry => entry.vague).length,
  };
}

function walkSourceFiles(projectRoot) {
  const files = [];
  for (const relativeRoot of SOURCE_ROOTS) {
    const absoluteRoot = path.join(projectRoot, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    const stack = [absoluteRoot];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolutePath = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(absolutePath);
        else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolutePath);
      }
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function classifyLayer(relativePath) {
  const parts = relativePath.split('/');
  return parts[0] === 'esm' && parts[1] === 'native' ? parts[2] || 'native' : 'boot';
}

export function collectProductionEmptyCatchInventory(projectRoot = process.cwd()) {
  const entries = [];
  const statementFreeByLayer = {};
  const bareByLayer = {};
  const vagueByLayer = {};
  for (const absolutePath of walkSourceFiles(projectRoot)) {
    const relativePath = path.relative(projectRoot, absolutePath).split(path.sep).join('/');
    const counts = countEmptyCatchesInSource(fs.readFileSync(absolutePath, 'utf8'), relativePath);
    if (!counts.statementFree) continue;
    entries.push({ file: relativePath, ...counts });
    const layer = classifyLayer(relativePath);
    statementFreeByLayer[layer] = (statementFreeByLayer[layer] || 0) + counts.statementFree;
    bareByLayer[layer] = (bareByLayer[layer] || 0) + counts.bare;
    vagueByLayer[layer] = (vagueByLayer[layer] || 0) + counts.vague;
  }
  return {
    entries,
    statementFreeByLayer: Object.fromEntries(
      Object.entries(statementFreeByLayer).sort(([left], [right]) => left.localeCompare(right))
    ),
    bareByLayer: Object.fromEntries(
      Object.entries(bareByLayer).sort(([left], [right]) => left.localeCompare(right))
    ),
    vagueByLayer: Object.fromEntries(
      Object.entries(vagueByLayer).sort(([left], [right]) => left.localeCompare(right))
    ),
    statementFreeTotal: entries.reduce((sum, entry) => sum + entry.statementFree, 0),
    bareTotal: entries.reduce((sum, entry) => sum + entry.bare, 0),
    vagueTotal: entries.reduce((sum, entry) => sum + entry.vague, 0),
    bareFileCount: entries.filter(entry => entry.bare > 0).length,
    vagueFileCount: entries.filter(entry => entry.vague > 0).length,
  };
}

function auditLayerRatchet(actualByLayer, expectedByLayer, label, failures) {
  const expectedLayers = Object.keys(expectedByLayer).sort();
  const actualLayers = Object.keys(actualByLayer).sort();
  if (JSON.stringify(actualLayers) !== JSON.stringify(expectedLayers)) {
    failures.push(
      `${label} layer inventory mismatch: expected ${expectedLayers.join(', ')}, got ${actualLayers.join(', ')}`
    );
  }
  for (const layer of expectedLayers) {
    const expected = expectedByLayer[layer];
    const actual = actualByLayer[layer] || 0;
    if (actual !== expected) {
      failures.push(
        `${layer}: ${label} ratchet changed (${actual} actual, ${expected} expected); classify the change and update the current-state ceiling intentionally`
      );
    }
  }
}

export function runSilentCatchPolicyAudit(projectRoot = process.cwd()) {
  const inventory = collectProductionEmptyCatchInventory(projectRoot);
  const failures = [];
  auditLayerRatchet(
    inventory.statementFreeByLayer,
    EXPECTED_STATEMENT_FREE_CATCHES_BY_LAYER,
    'statement-free catch',
    failures
  );
  auditLayerRatchet(inventory.bareByLayer, EXPECTED_BARE_CATCHES_BY_LAYER, 'bare catch', failures);
  auditLayerRatchet(
    inventory.vagueByLayer,
    EXPECTED_VAGUE_CATCH_COMMENTS_BY_LAYER,
    'vague catch comment',
    failures
  );

  const inventoryByFile = new Map(inventory.entries.map(entry => [entry.file, entry.statementFree]));
  for (const file of FUNCTIONAL_OWNERS_WITHOUT_SILENT_CATCHES) {
    const count = inventoryByFile.get(file) || 0;
    if (count > 0) failures.push(`${file}: functional owner contains ${count} silent catch block(s)`);
  }

  return { ok: failures.length === 0, failures, inventory };
}

function main() {
  let result;
  try {
    result = runSilentCatchPolicyAudit(process.cwd());
  } catch (error) {
    console.error(`[silent-catch-policy] FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  if (!result.ok) {
    console.error(`[silent-catch-policy] FAILED with ${result.failures.length} issue(s)`);
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `[silent-catch-policy] ok (${result.inventory.statementFreeTotal} statement-free catches, ${result.inventory.bareTotal} bare catches, ${result.inventory.vagueTotal} vague catch comments, ${result.inventory.entries.length} files)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
