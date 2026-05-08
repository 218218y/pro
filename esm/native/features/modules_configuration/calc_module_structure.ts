// Pure module-structure calculator (ESM)
//
// Plain, dependency-free owner that callers import directly
// (builder/kernel/canvas-picking).
//
// Design goals:
// - No App/store/DOM access.
// - Deterministic output.
// - Defensive parsing: invalid inputs resolve through the canonical default layout.

import type { ModulesStructureItemLike } from '../../../../types/index.js';

export type ModulesStructureItem = ModulesStructureItemLike;
export type ModuleStructureWardrobeType = 'hinged' | 'sliding';

export function normalizeModuleStructureWardrobeType(v: unknown): ModuleStructureWardrobeType {
  const s = String(v ?? '')
    .trim()
    .toLowerCase();
  return s === 'sliding' ? 'sliding' : 'hinged';
}

export function normalizeModuleStructureDoorCount(n: unknown, wardrobeType: unknown): number {
  const v = parseInt(String(n ?? ''), 10);
  const type = normalizeModuleStructureWardrobeType(wardrobeType);
  const minDoors = type === 'sliding' ? 2 : 0;
  if (!Number.isFinite(v) || v < minDoors) return minDoors;
  return v;
}

function readPositiveDoorCountList(value: unknown[]): number[] | null {
  if (!value.length) return null;
  const out: number[] = [];
  for (const item of value) {
    const n = parseInt(String(item ?? ''), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    out.push(n);
  }
  return out;
}

export function readModuleStructureSelectSignature(value: unknown): number[] | null {
  if (Array.isArray(value)) return readPositiveDoorCountList(value);

  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return Array.isArray(parsed) ? readPositiveDoorCountList(parsed) : null;
}

function sumDoorSignature(signature: number[]): number {
  let sum = 0;
  for (let i = 0; i < signature.length; i += 1) sum += signature[i];
  return sum;
}

export function normalizeModuleStructureSelectForDoors(
  doorsCount: unknown,
  wardrobeType: unknown,
  structureSelectValue: unknown
): unknown {
  const signature = readModuleStructureSelectSignature(structureSelectValue);
  if (!signature) return structureSelectValue;

  const doors = normalizeModuleStructureDoorCount(doorsCount, wardrobeType);
  return sumDoorSignature(signature) === doors ? structureSelectValue : '';
}

/**
 * Returns an array of `{ doors: number }` entries describing the module structure.
 *
 * Canonical layout policy:
 * - Sliding wardrobes: one door per module.
 * - Hinged wardrobes:
 *   - Even door count: pairs.
 *   - Odd door count: depends on `singlePos` (left/right/center/center-left/center-right).
 *
 * `structureSelectValue` may contain an exact door-count signature (e.g. "[2,1,2]") or be empty.
 */
export function calculateModuleStructure(
  doorsCount: unknown,
  singlePos: unknown,
  structureSelectValue: unknown,
  wardrobeType: unknown
): ModulesStructureItem[] {
  const type = normalizeModuleStructureWardrobeType(wardrobeType);
  const doors = normalizeModuleStructureDoorCount(doorsCount, type);

  if (doors <= 0) return [];

  // Sliding wardrobes: always one door per module.
  if (type === 'sliding') {
    const out: ModulesStructureItem[] = [];
    for (let i = 0; i < doors; i++) out.push({ doors: 1 });
    return out;
  }

  const signature = readModuleStructureSelectSignature(structureSelectValue);
  if (signature && sumDoorSignature(signature) === doors) {
    return signature.map((d: number): ModulesStructureItem => ({ doors: d }));
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

  // Unknown singlePos: use the left-side single-door layout.
  pushSingle();
  pushPairs(pairs);
  return out;
}
