import fs from 'node:fs';
import path from 'node:path';

const FALLBACK_BASE_COST = 0.25;
const FALLBACK_BYTES_PER_COST = 32 * 1024;

// Relative costs from a full Node 24 runtime-suite profile. Keep only measured
// outliers here; ordinary and newly added tests use the deterministic size-based
// fallback below until a later profile proves that they are outliers too.
export const KNOWN_SLOW_TEST_COSTS = Object.freeze({
  'tests/wardrobe_dimension_guide_owner_contract.test.js': 213.781,
  'tests/wardrobe_sanitization_policy_ownership_contract.test.js': 165.318,
  'tests/library_preset_dimension_ownership_closeout_contract.test.js': 162.152,
  'tests/order_pdf_dimension_support_ownership_contract.test.js': 104.858,
  'tests/interior_fittings_dimension_ownership_closeout_contract.test.js': 100.846,
  'tests/wp_layer_contract_runtime.test.js': 91.81,
  'tests/kernel_project_capture_dimension_ownership_contract.test.js': 86.375,
  'tests/interior_storage_dimension_ownership_closeout_contract.test.js': 74.303,
  'tests/wardrobe_layout_dimension_ownership_closeout_contract.test.js': 71.693,
  'tests/carcass_base_dimension_ownership_closeout_contract.test.js': 63.985,
  'tests/carcass_cornice_shell_dimension_ownership_closeout_contract.test.js': 61.823,
  'tests/no_main_sketch_dimension_ownership_contract.test.js': 51.009,
  'tests/build_flow_plan_inputs_dimension_ownership_contract.test.js': 50.964,
  'tests/sketch_box_preview_ownership_closeout_contract.test.js': 44.578,
  'tests/material_dimension_ownership_closeout_contract.test.js': 38.742,
  'tests/carcass_interior_dimension_ownership_closeout_contract.test.js': 36.425,
  'tests/canvas_picking_interior_hover_manual_mode_runtime.test.ts': 35.689,
});

function normalizeSlash(value) {
  return String(value).split(path.sep).join('/');
}

function normalizeCost(value, filePath) {
  if (Number.isFinite(value) && value > 0) return value;
  throw new Error(`[WardrobePro] invalid test shard cost for ${String(filePath)}.`);
}

export function estimateTestShardCost(filePath, projectRoot = process.cwd()) {
  const relativePath = normalizeSlash(path.relative(projectRoot, filePath));
  const knownCost = KNOWN_SLOW_TEST_COSTS[relativePath];
  if (knownCost) return knownCost;

  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile()) return FALLBACK_BASE_COST + stat.size / FALLBACK_BYTES_PER_COST;
  } catch {
    // Virtual file lists used by focused tooling still receive a stable baseline cost.
  }
  return FALLBACK_BASE_COST;
}

function isBetterTarget(candidate, current) {
  if (candidate.estimatedCost !== current.estimatedCost) {
    return candidate.estimatedCost < current.estimatedCost;
  }
  if (candidate.fileOrdinals.length !== current.fileOrdinals.length) {
    return candidate.fileOrdinals.length < current.fileOrdinals.length;
  }
  return candidate.index < current.index;
}

export function createBalancedTestShardPlan(files, total, options = {}) {
  if (!Array.isArray(files)) throw new TypeError('[WardrobePro] test shard files must be an array.');
  if (!Number.isInteger(total) || total < 1) {
    throw new Error('[WardrobePro] test shard total must be a positive integer.');
  }

  const costForFile =
    typeof options.costForFile === 'function'
      ? options.costForFile
      : filePath => estimateTestShardCost(filePath);
  const candidates = files
    .map((file, ordinal) => ({
      file,
      ordinal,
      cost: normalizeCost(costForFile(file, ordinal), file),
    }))
    .sort((left, right) => right.cost - left.cost || left.ordinal - right.ordinal);
  const shards = Array.from({ length: total }, (_, index) => ({
    index,
    estimatedCost: 0,
    fileOrdinals: [],
  }));

  for (const candidate of candidates) {
    let target = shards[0];
    for (let index = 1; index < shards.length; index += 1) {
      if (isBetterTarget(shards[index], target)) target = shards[index];
    }
    target.estimatedCost += candidate.cost;
    target.fileOrdinals.push(candidate.ordinal);
  }

  return shards.map(shard => ({
    index: shard.index + 1,
    estimatedCost: shard.estimatedCost,
    files: shard.fileOrdinals.sort((left, right) => left - right).map(ordinal => files[ordinal]),
  }));
}
