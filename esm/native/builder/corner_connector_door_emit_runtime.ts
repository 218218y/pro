import type { AppContainer } from '../../../types';
import { getRenderNamespace } from '../runtime/render_access.js';
import { asRecord } from '../runtime/record.js';
import type { CornerConnectorDoorContext } from './corner_connector_door_emit_contracts.js';

type ValueRecord = Record<string, unknown>;

type CornerWingMaterialsResult = ReturnType<typeof import('./corner_materials.js').createCornerWingMaterials>;

type CornerConnectorDoorCtx = ValueRecord & {
  App: AppContainer;
  THREE: CornerConnectorDoorContext['THREE'];
  woodThick: number;
  startY: number;
  wingH: number;
  uiAny: ValueRecord;
  splitDoors: boolean;
  doorStyle: string;
  groovesEnabled: boolean;
  getGroove: unknown;
  getCurtain: unknown;
  __readScopedReader: CornerWingMaterialsResult['readScopedReader'];
  __resolveSpecial: CornerWingMaterialsResult['resolveSpecial'];
  __getMirrorMat: CornerWingMaterialsResult['getMirrorMat'];
  getCornerMat: CornerWingMaterialsResult['getCornerMat'];
  frontMat: unknown;
  createDoorVisual: CornerConnectorDoorContext['createDoorVisual'];
  addOutlines: CornerConnectorDoorContext['addOutlines'];
  removeDoorsEnabled: boolean;
  __isDoorRemoved: (partId: string) => boolean;
  __individualColors: unknown;
  __sketchMode: boolean;
  config: ValueRecord | null | undefined;
  __stackKey: string;
  __stackSplitEnabled?: boolean;
  __stackScopePartKey: (partId: unknown) => string;
};

export function isCornerConnectorDoorCtx(value: unknown): value is CornerConnectorDoorCtx {
  const rec = asRecord(value);
  return (
    !!rec &&
    typeof rec.createDoorVisual === 'function' &&
    typeof rec.addOutlines === 'function' &&
    typeof rec.__isDoorRemoved === 'function' &&
    typeof rec.__stackScopePartKey === 'function'
  );
}

export function readCurtainType(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  if (typeof value === 'undefined') return undefined;
  return String(value);
}

export function readCornerConnectorRenderRecord(
  App: AppContainer,
  asRecordFn: (value: unknown) => ValueRecord
): ValueRecord | null {
  return asRecordFn(getRenderNamespace(App));
}
