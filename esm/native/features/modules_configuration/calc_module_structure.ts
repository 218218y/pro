// Pure module-structure calculator (ESM)
//
// Previously exposed through a legacy surface; now a direct import (pure ESM).
// In the post-migration architecture, it is a plain, dependency-free function that
// callers can import directly (builder/kernel/canvas-picking).
//
// Design goals:
// - No App/store/DOM access.
// - Deterministic output.
// - Defensive parsing: invalid inputs fall back to a sensible default.

import type { ModulesStructureItemLike } from '../../../../types/index.js';

export type ModulesStructureItem = ModulesStructureItemLike;

function _clampDoors(n: unknown, wardrobeType: unknown): number {
  const v = parseInt(String(n ?? ''), 10);
  const type = _normWardrobeType(wardrobeType);
  const minDoors = type === 'sliding' ? 2 : 0;
  if (!Number.isFinite(v) || v < minDoors) return minDoors;
  return v;
}

function _normWardrobeType(v: unknown): 'hinged' | 'sliding' {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  return s === 'sliding' ? 'sliding' : 'hinged';
}

function _safeParseStructureSelect(v: unknown): unknown {
  const s = String(v ?? '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    // Treat as legacy keyword or garbage; caller will fall back to default.
    return 'default';
  }
}

/**
 * Returns an array of `{ doors: number }` entries describing the module structure.
 *
 * Legacy behavior preserved:
 * - Sliding wardrobes: one door per module.
 * - Hinged wardrobes:
 *   - Even door count: pairs.
 *   - Odd door count: depends on `singlePos` (left/right/center/center-left/center-right).
 *
 * `structureSelectValue` may contain a JSON array (e.g. "[2,1,2]") or be empty.
 */
export function calculateModuleStructure(
  doorsCount: unknown,
  singlePos: unknown,
  structureSelectValue: unknown,
  wardrobeType: unknown
): ModulesStructureItem[] {
  const type = _normWardrobeType(wardrobeType);
  const doors = _clampDoors(doorsCount, type);

  if (doors <= 0) return [];

  // Sliding wardrobes: always one door per module.
  if (type === 'sliding') {
    const out: ModulesStructureItem[] = [];
    for (let i = 0; i < doors; i++) out.push({ doors: 1 });
    return out;
  }

  const parsed = _safeParseStructureSelect(structureSelectValue);
  if (Array.isArray(parsed)) {
    return parsed.map((x: unknown): ModulesStructureItem => {
      const d = parseInt(String(x ?? ''), 10);
      return { doors: Number.isFinite(d) && d > 0 ? d : 1 };
    });
  }

  // Default behavior.
  const out: ModulesStructureItem[] = [];

  // Even: pairs.
  if (doors % 2 === 0) {
    for (let p = 0; p < doors; p += 2) out.push({ doors: 2 });
    return out;
  }

  // Odd: place the single door according to singlePos.
  const pos = String(singlePos ?? '')
    .trim()
    .toLowerCase();

  const pushPairs = (countPairs: number) => {
    for (let i = 0; i < countPairs; i++) out.push({ doors: 2 });
  };

  const pushSingle = () => out.push({ doors: 1 });

  const pairs = Math.floor((doors - 1) / 2);

  if (!pos || pos === 'left') {
    pushSingle();
    pushPairs(pairs);
    return out;
  }

  if (pos === 'right') {
    pushPairs(pairs);
    pushSingle();
    return out;
  }

  // Center variants.
  if (pos === 'center' || pos === 'middle' || pos === 'centre') {
    const leftPairs = Math.floor(pairs / 2);
    const rightPairs = pairs - leftPairs;
    pushPairs(leftPairs);
    pushSingle();
    pushPairs(rightPairs);
    return out;
  }

  if (pos === 'center-left' || pos === 'middle-left') {
    const leftPairs = Math.max(0, Math.ceil(pairs / 2));
    const rightPairs = pairs - leftPairs;
    pushPairs(leftPairs);
    pushSingle();
    pushPairs(rightPairs);
    return out;
  }

  if (pos === 'center-right' || pos === 'middle-right') {
    const leftPairs = Math.max(0, Math.floor(pairs / 2));
    const rightPairs = pairs - leftPairs;
    pushPairs(leftPairs);
    pushSingle();
    pushPairs(rightPairs);
    return out;
  }

  // Unknown singlePos: safest fallback is "left".
  pushSingle();
  pushPairs(pairs);
  return out;
}
