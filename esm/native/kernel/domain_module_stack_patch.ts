// Explicit domain stack-patch descriptor normalization.
//
// Why this exists:
// - domain_api accepts a few historical patch descriptor shapes
// - the normalization policy should live in one explicit helper, not inside installDomainApi
// - keeping the compat parser separate makes the canonical patch seam easier to reason about

import type {
  ModuleConfigPatchLike,
  ModulePatchCompatInput,
  ModuleStackName,
  ModuleStackPatchDescriptor,
  ModuleStackPatchKey,
  UnknownRecord,
} from '../../../types';

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function normalizeModuleStackName(input: unknown): ModuleStackName {
  const raw = String(input ?? '')
    .trim()
    .toLowerCase();
  return raw === 'bottom' || raw === 'lower' ? 'bottom' : 'top';
}

function readCompatInput(value: unknown): ModulePatchCompatInput | null {
  return isRecord(value) ? value : null;
}

function readModuleConfigPatch(value: unknown): ModuleConfigPatchLike {
  return isRecord(value) ? value : {};
}

export function normalizeModuleStackPatchKey(moduleKey: unknown): ModuleStackPatchKey | null {
  if (typeof moduleKey === 'number' && Number.isFinite(moduleKey)) return Math.floor(moduleKey);
  if (typeof moduleKey === 'string') {
    const trimmed = moduleKey.trim();
    return trimmed ? trimmed : null;
  }
  const coerced = String(moduleKey == null ? '' : moduleKey).trim();
  return coerced ? coerced : null;
}

export function resolveModulePatchCompatDescriptor(input: unknown): ModuleStackPatchDescriptor | null {
  const obj = readCompatInput(input);
  if (!obj) return null;

  const hasIndex = typeof obj.index === 'number' && Number.isFinite(obj.index) && obj.index >= 0;
  const lowerFlag = obj.lower === true || obj.bottom === true;
  const stack = lowerFlag ? 'bottom' : normalizeModuleStackName(obj.stack ?? obj.side ?? obj.layer ?? '');

  const indexModuleKey = hasIndex ? Math.floor(obj.index ?? 0) : undefined;
  const moduleKey = normalizeModuleStackPatchKey(obj.moduleKey ?? obj.module ?? obj.key ?? indexModuleKey);

  if (moduleKey == null) return null;
  const patch = readModuleConfigPatch(obj.patch);
  return { stack, moduleKey, patch };
}
