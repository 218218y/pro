import { createRemovedFrameSideConstructionCapabilities } from './removed_frame_side_construction_capabilities.js';
import {
  resolveRemovedFrameSideConstructionPlan,
  type RemovedFrameSideConstructionEdgePlan,
  type RemovedFrameSideConstructionPlan,
} from './removed_frame_side_construction_plan.js';

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readEdgePlan(value: unknown): RemovedFrameSideConstructionEdgePlan | null {
  const record = readRecord(value);
  if (!record || typeof record.removed !== 'boolean' || typeof record.roundedShelves !== 'boolean') {
    return null;
  }
  return record as RemovedFrameSideConstructionEdgePlan;
}

export function readRemovedFrameSideConstructionPlan(
  value: unknown
): RemovedFrameSideConstructionPlan | null {
  const record = readRecord(value);
  if (!record) return null;
  const frameSidePartIdPrefix = record.frameSidePartIdPrefix;
  if (frameSidePartIdPrefix !== '' && frameSidePartIdPrefix !== 'lower_') return null;
  const left = readEdgePlan(record.left);
  const right = readEdgePlan(record.right);
  if (!left || !right || typeof record.hasRemovedSide !== 'boolean') return null;
  if (record.hasRemovedSide !== (left.removed || right.removed)) return null;
  return record as RemovedFrameSideConstructionPlan;
}

/**
 * Runtime adapter for render-op entry points that may be called outside the
 * canonical module-loop pipeline. Normal production flow injects the already
 * resolved plan; absent or invalid injection is adapted from a narrow config
 * snapshot here.
 */
export function resolveRemovedFrameSideConstructionPlanAtBoundary(args: {
  constructionPlan?: unknown;
  cfg?: unknown;
  frameSidePartIdPrefix?: unknown;
}): RemovedFrameSideConstructionPlan {
  const injected = readRemovedFrameSideConstructionPlan(args.constructionPlan);
  if (injected) return injected;
  if (args.constructionPlan !== undefined) {
    throw new TypeError('[removed-frame-side] injected construction plan is invalid');
  }

  const capabilities = createRemovedFrameSideConstructionCapabilities(args.cfg);
  return resolveRemovedFrameSideConstructionPlan({
    capabilities,
    frameSidePartIdPrefix: args.frameSidePartIdPrefix,
  });
}
