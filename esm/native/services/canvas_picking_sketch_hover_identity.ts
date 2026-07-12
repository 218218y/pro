import type { UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';
import type { ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';

export type SketchHoverModuleKey = ModuleKey | null;

export type SketchHoverHostLike = {
  moduleKey: SketchHoverModuleKey;
  isBottom: boolean;
};

export type SketchHoverHostIdentity = {
  hostModuleKey: SketchHoverModuleKey;
  hostIsBottom: boolean;
};

export type ToSketchHoverModuleKeyFn = (value: unknown) => SketchHoverModuleKey;

const hasOwn = (record: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

export function createSketchHoverHostIdentity(host: SketchHoverHostLike): SketchHoverHostIdentity {
  return {
    hostModuleKey: host.moduleKey,
    hostIsBottom: host.isBottom === true,
  };
}

export function hasRetiredSketchHoverHostIdentity(value: unknown): boolean {
  const record = asRecord(value);
  return !!record && (hasOwn(record, 'moduleKey') || hasOwn(record, 'isBottom'));
}

export function readSketchHoverHostIdentity(
  value: unknown,
  toModuleKey: ToSketchHoverModuleKeyFn
): SketchHoverHostLike | null {
  const record = asRecord(value);
  if (!record || hasRetiredSketchHoverHostIdentity(record)) return null;
  if (!hasOwn(record, 'hostModuleKey') || typeof record.hostIsBottom !== 'boolean') return null;

  const rawModuleKey = record.hostModuleKey;
  const moduleKey = toModuleKey(rawModuleKey);
  if (rawModuleKey != null && moduleKey == null) return null;
  return { moduleKey, isBottom: record.hostIsBottom };
}

export function assertCanonicalSketchHoverRecord(record: UnknownRecord): void {
  if (hasRetiredSketchHoverHostIdentity(record)) {
    throw new TypeError(
      '[WardrobePro] sketch hover records must use hostModuleKey/hostIsBottom only; moduleKey/isBottom are retired'
    );
  }
  if (!hasOwn(record, 'hostModuleKey') || typeof record.hostIsBottom !== 'boolean') {
    throw new TypeError('[WardrobePro] sketch hover record is missing canonical host identity');
  }
}
