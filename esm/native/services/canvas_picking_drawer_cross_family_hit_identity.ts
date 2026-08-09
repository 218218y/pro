import type { AppContainer, UnknownRecord } from '../../../types';
import { getDrawersArray } from '../runtime/render_access.js';
import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { resolveDrawerBoxOwnerPartId } from '../features/part_identity/api.js';
import {
  isSketchInternalDrawerCassettePartId,
  SKETCH_INTERNAL_DRAWER_CASSETTE_PART_SUFFIX,
} from '../features/sketch_internal_drawer_cassette.js';
import type { CrossDrawerFamily, CrossDrawerHit } from './canvas_picking_drawer_cross_family_model.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import { __wp_isViewportRoot } from './canvas_picking_local_helpers_runtime.js';

export type CrossDrawerObjectNode = Record<string, unknown> & {
  parent?: CrossDrawerObjectNode | null;
  userData?: UnknownRecord | null;
};

export function asCrossDrawerNode(value: unknown): CrossDrawerObjectNode | null {
  return value && typeof value === 'object' ? (value as CrossDrawerObjectNode) : null;
}

export function readCrossDrawerUserData(value: unknown): UnknownRecord | null {
  const userData = asCrossDrawerNode(value)?.userData;
  return userData && typeof userData === 'object' && !Array.isArray(userData) ? userData : null;
}

export function readCrossDrawerString(value: unknown): string {
  return formatIdentityValue(readIdentityValue(value));
}

function stripSketchInternalDrawerSlotSuffix(partId: string): string {
  return partId.replace(/_(?:lower|upper)$/u, '');
}

function readSketchInternalDrawerStackPartId(partId: string): string {
  return partId.startsWith('div_int_sketch_') ? stripSketchInternalDrawerSlotSuffix(partId) : partId;
}

function readCanonicalInternalCassettePartId(partId: string, userData: UnknownRecord | null): string {
  const stackPartId = readCrossDrawerString(userData?.__wpInternalDrawerCassetteStackPartId);
  if (stackPartId) return stackPartId;
  if (!isSketchInternalDrawerCassettePartId(partId)) return partId;
  return partId.slice(0, -SKETCH_INTERNAL_DRAWER_CASSETTE_PART_SUFFIX.length);
}

export function readCrossDrawerCanonicalPartId(partId: unknown, userData?: UnknownRecord | null): string {
  const raw = readCrossDrawerString(partId);
  const ud = userData || null;
  const owner = resolveDrawerBoxOwnerPartId(ud);
  const canonicalPartId = readCanonicalInternalCassettePartId(owner || raw, ud);
  return readSketchInternalDrawerStackPartId(canonicalPartId);
}

export function readCrossDrawerModuleKeyFromInternalPartId(partId: string): string {
  const prefix = 'div_int_sketch_';
  if (!partId.startsWith(prefix)) return '';
  const suffix = partId.slice(prefix.length);
  const splitAt = suffix.indexOf('_');
  return splitAt > 0 ? suffix.slice(0, splitAt) : '';
}

export function classifyCrossDrawerPart(partId: unknown, userData?: UnknownRecord | null): CrossDrawerFamily {
  const ud = userData || null;
  const canonicalPartId = readCrossDrawerCanonicalPartId(partId, ud);
  if (!canonicalPartId) return 'other';

  if (
    ud?.__wpSketchExtDrawer === true ||
    canonicalPartId.startsWith('sketch_ext_drawers_') ||
    /^sketch_box(?:_free)?_.+_ext_drawers_/.test(canonicalPartId)
  ) {
    return 'sketch_external';
  }

  if (canonicalPartId.startsWith('div_int_sketch_')) return 'sketch_internal';
  if (/^d\d+_draw_(?:shoe|\d+)$/.test(canonicalPartId)) return 'standard_external';
  return 'other';
}

function isCrossDrawerShoePart(partId: unknown, userData?: UnknownRecord | null): boolean {
  const ud = userData || null;
  const canonicalPartId = readCrossDrawerCanonicalPartId(partId, ud);
  return ud?.__wpShoeDrawer === true || /^d\d+_draw_shoe$/.test(canonicalPartId);
}

export function findStandardExternalShoePartIdForModule(App: AppContainer, moduleKey: unknown): string {
  const targetModuleKey = readCrossDrawerString(moduleKey);
  const drawers = getDrawersArray(App);
  for (let i = 0; i < drawers.length; i++) {
    const group = readCrossDrawerEntryGroup(drawers[i]);
    if (!group) continue;
    const userData = readCrossDrawerUserData(group);
    const partId = readCrossDrawerCanonicalPartId(
      userData?.partId ?? asCrossDrawerNode(drawers[i])?.id,
      userData
    );
    if (classifyCrossDrawerPart(partId, userData) !== 'standard_external') continue;
    if (!isCrossDrawerShoePart(partId, userData)) continue;
    const entryModuleKey = readCrossDrawerString(
      userData?.moduleIndex ?? userData?.__wpSketchModuleKey ?? asCrossDrawerNode(drawers[i])?.moduleIndex
    );
    if (targetModuleKey && entryModuleKey && targetModuleKey !== entryModuleKey) continue;
    return partId;
  }
  return '';
}

export function findCrossDrawerHitOnObject(
  App: AppContainer,
  object: unknown,
  allowed: CrossDrawerFamily[]
): CrossDrawerHit | null {
  let node = asCrossDrawerNode(object);
  while (node && !__wp_isViewportRoot(App, node)) {
    const userData = readCrossDrawerUserData(node);
    const rawPartId = readCrossDrawerString(userData?.partId);
    const partId = readCrossDrawerCanonicalPartId(rawPartId, userData);
    const family = classifyCrossDrawerPart(partId, userData);
    if (partId && allowed.includes(family)) {
      return {
        object: node,
        partId,
        family,
        moduleIndex:
          readCrossDrawerString(userData?.moduleIndex ?? userData?.__wpSketchModuleKey) ||
          readCrossDrawerModuleKeyFromInternalPartId(partId),
        sketchExtDrawerId: readCrossDrawerString(userData?.__wpSketchExtDrawerId),
        sketchBoxId: readCrossDrawerString(userData?.__wpSketchBoxId),
        sketchExternalListKind:
          userData?.__wpRegularExternalDrawer === true
            ? 'regular-external'
            : userData?.__wpRegularExternalDrawer === false
              ? 'custom-external'
              : null,
      };
    }
    node = asCrossDrawerNode(node.parent);
  }
  return null;
}

export function findCrossDrawerHitInIntersects(
  App: AppContainer,
  intersects: RaycastHitLike[],
  family: CrossDrawerFamily | CrossDrawerFamily[]
): CrossDrawerHit | null {
  const allowed = Array.isArray(family) ? family : [family];
  for (let i = 0; i < intersects.length; i++) {
    const hit = findCrossDrawerHitOnObject(App, intersects[i]?.object, allowed);
    if (hit) return hit;
  }
  return null;
}

export function readCrossDrawerEntryGroup(entry: unknown): CrossDrawerObjectNode | null {
  return asCrossDrawerNode(
    readCrossDrawerUserData(entry)?.group ?? (asCrossDrawerNode(entry)?.group as unknown)
  );
}
