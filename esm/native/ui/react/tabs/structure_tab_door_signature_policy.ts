// The Structure Tab owns how an authored door signature changes when the
// user edits the total door count. The feature calculator only consumes the
// resulting signature; it does not need to know UI edit intent.

function readPositiveDoorCount(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const count = Math.trunc(value);
    return count > 0 ? count : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/^[+-]?\d+$/.test(text)) return null;
  const count = Number(text);
  return Number.isSafeInteger(count) && count > 0 ? count : null;
}

function readAuthoredDoorSignature(value: unknown): number[] | null {
  let parsed = value;
  if (typeof value === 'string') {
    if (!value.trim()) return null;
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || !parsed.length) return null;
  const signature: number[] = [];
  for (const entry of parsed) {
    const count = readPositiveDoorCount(entry);
    if (count === null) return null;
    signature.push(count);
  }
  return signature;
}

/**
 * When the number of doors changes, retain an explicitly authored cell layout
 * instead of silently replacing it with the default odd/even distribution.
 * Existing cells keep their door counts; new leaves are added/removed at the
 * right edge. This is intentionally limited to the supported 1/2-leaf cells.
 * A stale or unsupported signature must not become a source of layout truth.
 */
export function resizeAuthoredModuleDoorSignature(
  structureSelect: unknown,
  previousDoors: number,
  nextDoors: number
): number[] | null {
  const signature = readAuthoredDoorSignature(structureSelect);
  if (
    !signature ||
    !Number.isInteger(previousDoors) ||
    !Number.isInteger(nextDoors) ||
    previousDoors < 1 ||
    nextDoors < 1 ||
    signature.some(doors => doors !== 1 && doors !== 2) ||
    signature.reduce((sum, doors) => sum + doors, 0) !== previousDoors
  )
    return null;

  const resized = signature.slice();
  let remaining = Math.abs(nextDoors - previousDoors);
  if (nextDoors > previousDoors) {
    if (resized[resized.length - 1] === 1 && remaining > 0) {
      resized[resized.length - 1] = 2;
      remaining--;
    }
    while (remaining >= 2) {
      resized.push(2);
      remaining -= 2;
    }
    if (remaining) resized.push(1);
  } else {
    while (remaining > 0 && resized.length) {
      const last = resized.length - 1;
      if (resized[last] === 1) resized.pop();
      else resized[last] = 1;
      remaining--;
    }
  }
  return resized.length ? resized : null;
}
