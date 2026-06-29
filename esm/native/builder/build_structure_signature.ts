import type { UnknownRecord } from '../../../types/index.js';

import { asRecord } from '../runtime/record.js';

type BuildShapeLike = {
  signature?: unknown;
  modulesStructure?: unknown;
};

function readRecord(value: unknown): UnknownRecord | null {
  return asRecord<UnknownRecord>(value);
}

function readBuildShape(state: unknown): BuildShapeLike | null {
  const envelope = readRecord(state);
  return envelope ? asRecord<BuildShapeLike>(envelope.build) : null;
}

function readDoorsCount(moduleShape: unknown): number | null {
  const rec = readRecord(moduleShape);
  if (!rec || rec.doors == null) return null;
  const doors = rec.doors;
  return typeof doors === 'number' && Number.isFinite(doors) && doors > 0 ? Math.trunc(doors) : null;
}

function normalizeSignatureArray(value: readonly unknown[]): number[] {
  return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
}

export function readBuildStructureSignature(state: unknown): unknown {
  const build = readBuildShape(state);
  if (!build) return null;

  if (Object.prototype.hasOwnProperty.call(build, 'signature')) {
    return Array.isArray(build.signature) ? normalizeSignatureArray(build.signature) : build.signature;
  }

  if (Array.isArray(build.modulesStructure)) {
    return build.modulesStructure.map(moduleShape => readDoorsCount(moduleShape) ?? 1);
  }

  return null;
}
