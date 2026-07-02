import type { UnknownRecord } from '../../../types';
import type { DomainApiSurfaceSectionsState } from './domain_api_surface_sections_contracts.js';

function readOwnMapValue(map: UnknownRecord, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

function isPlainDomainValueObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function areDomainMapValuesEquivalent(left: unknown, right: unknown, depth = 3): boolean {
  if (left == null && right == null) return true;
  if (Object.is(left, right)) return true;
  if (depth <= 0) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (!areDomainMapValuesEquivalent(left[index], right[index], depth - 1)) return false;
    }
    return true;
  }

  if (isPlainDomainValueObject(left) || isPlainDomainValueObject(right)) {
    if (!isPlainDomainValueObject(left) || !isPlainDomainValueObject(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
      if (!areDomainMapValuesEquivalent(left[key], right[key], depth - 1)) return false;
    }
    return true;
  }

  return false;
}

export function readDomainMapValue(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: string
): unknown {
  if (!mapName || !key) return undefined;
  const map = state._map(mapName);
  return map && typeof map === 'object' ? readOwnMapValue(map, key) : undefined;
}

export function shouldSkipSimpleMapWrite(
  state: DomainApiSurfaceSectionsState,
  mapName: string,
  key: string,
  value: unknown
): boolean {
  return !!mapName && !!key && areDomainMapValuesEquivalent(readDomainMapValue(state, mapName, key), value);
}
