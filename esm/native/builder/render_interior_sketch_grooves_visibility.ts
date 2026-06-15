import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

function asRecord(value: unknown): InteriorValueRecord | null {
  return value && typeof value === 'object' ? (value as InteriorValueRecord) : null;
}

function readBooleanToggle(value: unknown): boolean | null {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return null;
}

export function resolveSketchGroovesEnabled(input: unknown): boolean {
  const inputRecord = asRecord(input);
  const direct = readBooleanToggle(inputRecord?.isGroovesEnabled ?? inputRecord?.groovesEnabled);
  if (direct !== null) return direct;

  const uiRecord = asRecord(inputRecord?.ui);
  const uiDirect = readBooleanToggle(uiRecord?.groovesEnabled);
  if (uiDirect !== null) return uiDirect;

  return true;
}

export function resolveSketchGroovesEnabledFromBuildContext(ctx: unknown): boolean {
  const ctxRecord = asRecord(ctx);
  const flagsRecord = asRecord(ctxRecord?.flags);
  const direct = readBooleanToggle(flagsRecord?.isGroovesEnabled ?? flagsRecord?.groovesEnabled);
  return direct ?? true;
}
