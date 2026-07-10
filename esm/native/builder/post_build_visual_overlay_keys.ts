// Post-build visual overlay shared keys/helpers (Pure ESM)

export const SKETCH_BOX_DOOR_PENDING_STATE_KEY = '__wpSketchBoxDoorPendingState';

export function readStringOrNull(value: unknown): string | null {
  return formatIdentityValue(readIdentityValue(value)) || null;
}

export function getSketchBoxDoorPendingStateKey(moduleKey: string | null | undefined, boxId: string): string {
  const scope = moduleKey == null || moduleKey === '' ? '__free__' : String(moduleKey);
  return `${scope}::${String(boxId)}`;
}
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
