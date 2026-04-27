import type { ProjectCaptureServiceLike, ProjectDataLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

type ProjectCaptureResultLike = ProjectDataLike | UnknownRecord;

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readProjectCaptureService(value: unknown): ProjectCaptureServiceLike | null {
  return asRecord<ProjectCaptureServiceLike>(value);
}

function readProjectCaptureResult(value: unknown): ProjectCaptureResultLike | null {
  return isRecord(value) ? value : null;
}

export function getProjectCaptureServiceMaybe(App: unknown): ProjectCaptureServiceLike | null {
  try {
    return readProjectCaptureService(getServiceSlotMaybe(App, 'project'));
  } catch {
    return null;
  }
}

export function ensureProjectCaptureService(App: unknown): ProjectCaptureServiceLike {
  const service = ensureServiceSlot<ProjectCaptureServiceLike>(App, 'project');
  return readProjectCaptureService(service) || service;
}

export function captureProjectSnapshotMaybe(
  App: unknown,
  scope: unknown = 'persist'
): ProjectCaptureResultLike | null {
  try {
    const project = getProjectCaptureServiceMaybe(App);
    if (!project || typeof project.capture !== 'function') return null;
    const out = project.capture(scope);
    return readProjectCaptureResult(out);
  } catch {
    return null;
  }
}
