import type { AppContainer } from '../../../types';

import {
  buildDefaultProjectDataViaServiceOrThrow,
  exportProjectResultViaService,
} from '../runtime/project_io_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import { hashString32, stableSerializeCloudSyncValue } from './cloud_sync_support_shared.js';

const CLOUD_SKETCH_NON_DESIGN_ROOT_KEYS = new Set([
  '__app',
  '__createdAt',
  '__savedAt',
  '__scope',
  '__updatedAt',
  '__validation',
  '__schema',
  '__version',
  'dateString',
  'orderPdfEditorDraft',
  'orderPdfEditorZoom',
  'projectName',
  'timestamp',
  'version',
]);

function readCloudSketchComparableProjectData(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const comparable: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (!CLOUD_SKETCH_NON_DESIGN_ROOT_KEYS.has(key)) comparable[key] = entry;
  }
  return comparable;
}

export function computeCloudSketchSemanticHash(value: unknown): string {
  const serialized = stableSerializeCloudSyncValue(readCloudSketchComparableProjectData(value), {
    undefinedValue: 'null',
    bigintValue: 'quoted-n',
    otherPrimitiveValue: 'type-label',
  });
  return hashString32(serialized);
}

export function isDefaultCloudSketchSnapshot(
  App: AppContainer,
  snapshot: Pick<CloudSketchSnapshot, 'hash'>
): boolean {
  try {
    const defaultProject = buildDefaultProjectDataViaServiceOrThrow(
      App,
      'cloudSketch.buildDefaultProjectData'
    );
    return computeCloudSketchSemanticHash(defaultProject) === snapshot.hash;
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'cloudSketch.compareDefault', error, { throttleMs: 6000 });
    return false;
  }
}

export type CloudSketchSnapshot = {
  data: unknown;
  jsonStr: string;
  hash: string;
};

export function captureSketchSnapshot(App: AppContainer): CloudSketchSnapshot | null {
  try {
    const exportResult = exportProjectResultViaService(
      App,
      { source: 'cloudSketch.capture' },
      '[WardrobePro] Cloud sketch export failed.'
    );
    if ('reason' in exportResult) {
      _cloudSyncReportNonFatal(
        App,
        'captureSketchSnapshot.projectIoExport',
        new Error(exportResult.message || `ProjectIO export unavailable: ${exportResult.reason}`),
        { throttleMs: 6000 }
      );
      return null;
    }

    const ex = exportResult.exported;
    if (!ex.projectData) {
      _cloudSyncReportNonFatal(
        App,
        'captureSketchSnapshot.projectIoInvalid',
        new Error('ProjectIO export is missing projectData'),
        { throttleMs: 6000 }
      );
      return null;
    }
    return {
      data: ex.projectData,
      jsonStr: ex.jsonStr,
      hash: computeCloudSketchSemanticHash(ex.projectData),
    };
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'captureSketchSnapshot.outer', e, { throttleMs: 6000 });
    return null;
  }
}
