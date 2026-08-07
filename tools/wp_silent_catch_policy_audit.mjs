#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAstParserModule } from './wp_ast_adapter.mjs';

const SOURCE_ROOTS = ['esm/native', 'esm/boot'];
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const EXPECTED_STATEMENT_FREE_CATCHES_BY_LAYER = Object.freeze({
  adapters: 16,
  boot: 4,
  builder: 122,
  features: 12,
  io: 4,
  kernel: 19,
  platform: 61,
  runtime: 126,
  services: 106,
  ui: 211,
});
const EXPECTED_BARE_CATCHES_BY_LAYER = Object.freeze({
  adapters: 0,
  boot: 1,
  builder: 18,
  features: 1,
  io: 0,
  kernel: 10,
  platform: 15,
  runtime: 0,
  services: 1,
  ui: 26,
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
  'esm/native/runtime/app_helpers.ts',
  'esm/native/platform/render_scheduler.ts',
  'esm/native/ui/react/actions/modes_actions.ts',
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
    catches.push({ bare: bodyText.length === 0 });
  });
  return catches;
}

export function countEmptyCatchesInSource(source, file = 'source.ts') {
  const catches = collectStatementFreeCatches(source, file);
  return {
    statementFree: catches.length,
    bare: catches.filter(entry => entry.bare).length,
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
  for (const absolutePath of walkSourceFiles(projectRoot)) {
    const relativePath = path.relative(projectRoot, absolutePath).split(path.sep).join('/');
    const counts = countEmptyCatchesInSource(fs.readFileSync(absolutePath, 'utf8'), relativePath);
    if (!counts.statementFree) continue;
    entries.push({ file: relativePath, ...counts });
    const layer = classifyLayer(relativePath);
    statementFreeByLayer[layer] = (statementFreeByLayer[layer] || 0) + counts.statementFree;
    bareByLayer[layer] = (bareByLayer[layer] || 0) + counts.bare;
  }
  return {
    entries,
    statementFreeByLayer: Object.fromEntries(
      Object.entries(statementFreeByLayer).sort(([left], [right]) => left.localeCompare(right))
    ),
    bareByLayer: Object.fromEntries(
      Object.entries(bareByLayer).sort(([left], [right]) => left.localeCompare(right))
    ),
    statementFreeTotal: entries.reduce((sum, entry) => sum + entry.statementFree, 0),
    bareTotal: entries.reduce((sum, entry) => sum + entry.bare, 0),
    bareFileCount: entries.filter(entry => entry.bare > 0).length,
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
    `[silent-catch-policy] ok (${result.inventory.statementFreeTotal} statement-free catches, ${result.inventory.bareTotal} bare catches, ${result.inventory.entries.length} files)`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
