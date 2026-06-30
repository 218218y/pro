import {
  isRemovedFrameSideOn,
  isRoundedFrameSideShelvesOn,
  type RemovableFrameSide,
} from '../features/removable_parts.js';
import { readCanonicalPositiveIntegerText } from './build_flow_readers.js';

export type RemovedFrameSideBraceInput = {
  cfg?: unknown;
  moduleIndex?: unknown;
  modulesLength?: unknown;
  frameSidePartIdPrefix?: unknown;
};

export type RemovedFrameSideShelfRounding = 'left' | 'right' | 'both';

function readRuntimeIndex(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : -1;
}

export function shouldForceBraceShelvesForRemovedFrameSide(input: RemovedFrameSideBraceInput): boolean {
  const moduleIndex = readRuntimeIndex(input.moduleIndex);
  const modulesLength = readRuntimeIndex(input.modulesLength);
  if (!(moduleIndex >= 0) || !(modulesLength > 0)) return false;

  if (moduleIndex === 0 && isRemovedFrameSideOn(input.cfg, 'left', input.frameSidePartIdPrefix)) return true;
  if (
    moduleIndex === modulesLength - 1 &&
    isRemovedFrameSideOn(input.cfg, 'right', input.frameSidePartIdPrefix)
  )
    return true;
  return false;
}

function shouldRoundRemovedFrameSideShelves(
  cfg: unknown,
  side: RemovableFrameSide,
  moduleIndex: number,
  modulesLength: number,
  frameSidePartIdPrefix: unknown
): boolean {
  if (!isRemovedFrameSideOn(cfg, side, frameSidePartIdPrefix)) return false;
  if (!isRoundedFrameSideShelvesOn(cfg, side, frameSidePartIdPrefix)) return false;
  if (side === 'left') return moduleIndex === 0;
  return moduleIndex === modulesLength - 1;
}

export function getRoundedShelfSideForRemovedFrameSide(
  input: RemovedFrameSideBraceInput
): RemovedFrameSideShelfRounding | null {
  const moduleIndex = readRuntimeIndex(input.moduleIndex);
  const modulesLength = readRuntimeIndex(input.modulesLength);
  if (!(moduleIndex >= 0) || !(modulesLength > 0)) return null;

  const roundLeft = shouldRoundRemovedFrameSideShelves(
    input.cfg,
    'left',
    moduleIndex,
    modulesLength,
    input.frameSidePartIdPrefix
  );
  const roundRight = shouldRoundRemovedFrameSideShelves(
    input.cfg,
    'right',
    moduleIndex,
    modulesLength,
    input.frameSidePartIdPrefix
  );
  if (roundLeft && roundRight) return 'both';
  if (roundLeft) return 'left';
  if (roundRight) return 'right';
  return null;
}

export function forceShelfIndexesToBrace(args: {
  braceSet: Record<number, true>;
  shelfSet?: Record<number, true> | null;
  shelfVariantByIndex?: Record<number, string> | null;
  gridDivisions?: unknown;
}): void {
  const braceSet = args.braceSet;
  const shelfSet = args.shelfSet || null;

  const markBrace = (idx: number): void => {
    if (!Number.isFinite(idx) || idx < 1) return;
    braceSet[idx] = true;
  };

  if (shelfSet && Object.keys(shelfSet).length) {
    for (const key of Object.keys(shelfSet)) {
      const shelfIndex = readCanonicalPositiveIntegerText(key);
      if (shelfIndex != null && shelfSet[shelfIndex] === true) markBrace(shelfIndex);
    }
    return;
  }

  const gridDivisions = readRuntimeIndex(args.gridDivisions);
  const maxShelfIndex = gridDivisions > 1 ? gridDivisions - 1 : 0;
  for (let i = 1; i <= maxShelfIndex; i += 1) markBrace(i);
}
