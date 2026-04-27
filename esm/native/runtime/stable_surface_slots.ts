type StableSlotOwner = Record<string, unknown>;

type SlotValidator<T> = (value: unknown) => value is T;

function readValidSlot<T>(surface: StableSlotOwner, key: string, isValid: SlotValidator<T>): T | null {
  const value = surface[key];
  return isValid(value) ? value : null;
}

export function resolveStableSurfaceSlot<T>(
  surface: StableSlotOwner,
  key: string,
  stableKey: string,
  isValid: SlotValidator<T>,
  create?: () => T
): T | null {
  const stableValue = readValidSlot(surface, stableKey, isValid);
  if (stableValue) return stableValue;

  const publicValue = readValidSlot(surface, key, isValid);
  if (publicValue) return publicValue;

  return create ? create() : null;
}

export function healStableSurfaceSlot<T>(
  surface: StableSlotOwner,
  key: string,
  stableKey: string,
  isValid: SlotValidator<T>
): T | null {
  const canonical = resolveStableSurfaceSlot(surface, key, stableKey, isValid);
  if (!canonical) return null;

  if (surface[stableKey] !== canonical) surface[stableKey] = canonical;
  if (surface[key] !== canonical) surface[key] = canonical;

  return canonical;
}

export function installStableSurfaceSlot<T>(
  surface: StableSlotOwner,
  key: string,
  stableKey: string,
  isValid: SlotValidator<T>,
  create: () => T
): T {
  const canonical = resolveStableSurfaceSlot(surface, key, stableKey, isValid, create);
  if (!canonical) {
    throw new Error(`installStableSurfaceSlot(${String(key)}): factory must return a valid value`);
  }

  if (surface[stableKey] !== canonical) surface[stableKey] = canonical;
  if (surface[key] !== canonical) surface[key] = canonical;

  return canonical;
}
