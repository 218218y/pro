import { readCanonicalPositiveIntegerText } from './build_flow_readers.js';

function readRuntimeIndex(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : -1;
}

export function forceShelfIndexesToBrace(args: {
  braceSet: Record<number, true>;
  shelfSet?: Record<number, true> | null;
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
