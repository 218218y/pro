import type {
  Object3DLike,
  UnknownRecord,
  WardrobeProDebugSceneGeometrySnapshot,
  WardrobeProDebugSceneGeometrySummary,
} from '../../../types/index.js';

import { asRecord } from './record.js';

const SNAPSHOT_VERSION = 1 as const;
const MAX_TRAVERSED_NODES = 50_000;
const MAX_REPORTED_VIOLATIONS = 50;
const ROUND_FACTOR = 1_000_000;

type NumericArrayLike = ArrayLike<number>;

type GeometryPositionAttributeLike = UnknownRecord & {
  array?: NumericArrayLike;
  count?: number;
  itemSize?: number;
};

type GeometryBoundingBoxLike = UnknownRecord & {
  min?: UnknownRecord;
  max?: UnknownRecord;
};

type GeometryLike = UnknownRecord & {
  attributes?: UnknownRecord;
  boundingBox?: GeometryBoundingBoxLike | null;
};

type SceneNodeLike = Object3DLike & {
  geometry?: GeometryLike | null;
  type?: string;
};

type VectorTriplet = {
  x: number | null;
  y: number | null;
  z: number | null;
};

type GeometryScan = {
  vertexCount: number;
  invalidNumberCount: number;
  bounds: {
    min: VectorTriplet;
    max: VectorTriplet;
  } | null;
  canonical: string;
};

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundFinite(value: number | null): number | null {
  if (value === null) return null;
  const rounded = Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function readRoundedTriplet(value: unknown): VectorTriplet {
  const rec = asRecord(value);
  return {
    x: roundFinite(readFiniteNumber(rec?.x)),
    y: roundFinite(readFiniteNumber(rec?.y)),
    z: roundFinite(readFiniteNumber(rec?.z)),
  };
}

function formatTriplet(value: VectorTriplet): string {
  return `${value.x ?? '!'}/${value.y ?? '!'}/${value.z ?? '!'}`;
}

function readIdentityValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function readNodeIdentity(node: SceneNodeLike): string {
  const userData = asRecord(node.userData);
  return (
    readIdentityValue(userData?.partId) ||
    readIdentityValue(userData?.kind) ||
    readIdentityValue(node.name) ||
    readIdentityValue(node.type) ||
    (node.isMesh === true ? 'mesh' : 'node')
  );
}

function readPartId(node: SceneNodeLike): string {
  return readIdentityValue(asRecord(node.userData)?.partId);
}

function pushViolation(violations: string[], message: string): void {
  if (violations.length < MAX_REPORTED_VIOLATIONS) violations.push(message);
}

function countInvalidTriplet(value: VectorTriplet): number {
  return Number(value.x === null) + Number(value.y === null) + Number(value.z === null);
}

function readPositionAttribute(geometry: GeometryLike): GeometryPositionAttributeLike | null {
  return asRecord<GeometryPositionAttributeLike>(asRecord(geometry.attributes)?.position);
}

function readNumericArray(value: unknown): NumericArrayLike | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<NumericArrayLike>;
  return typeof candidate.length === 'number' && candidate.length >= 0 ? (value as NumericArrayLike) : null;
}

function deriveBoundsFromPositionArray(
  array: NumericArrayLike,
  itemSize: number
): { min: VectorTriplet; max: VectorTriplet; invalidNumberCount: number } | null {
  if (itemSize < 3 || array.length < 3) return null;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let validVertexCount = 0;
  let invalidNumberCount = 0;

  for (let offset = 0; offset + 2 < array.length; offset += itemSize) {
    const x = readFiniteNumber(array[offset]);
    const y = readFiniteNumber(array[offset + 1]);
    const z = readFiniteNumber(array[offset + 2]);
    invalidNumberCount += Number(x === null) + Number(y === null) + Number(z === null);
    if (x === null || y === null || z === null) continue;
    validVertexCount += 1;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  if (validVertexCount === 0) return null;
  return {
    min: readRoundedTriplet({ x: minX, y: minY, z: minZ }),
    max: readRoundedTriplet({ x: maxX, y: maxY, z: maxZ }),
    invalidNumberCount,
  };
}

function scanGeometry(geometry: GeometryLike): GeometryScan {
  const position = readPositionAttribute(geometry);
  const array = readNumericArray(position?.array);
  const itemSizeRaw = readFiniteNumber(position?.itemSize);
  const itemSize = itemSizeRaw !== null && itemSizeRaw >= 1 ? Math.floor(itemSizeRaw) : 3;
  const declaredCountRaw = readFiniteNumber(position?.count);
  const derivedCount = array ? Math.floor(array.length / Math.max(1, itemSize)) : 0;
  const vertexCount =
    declaredCountRaw !== null && declaredCountRaw >= 0 ? Math.floor(declaredCountRaw) : derivedCount;

  let arrayBounds: ReturnType<typeof deriveBoundsFromPositionArray> = null;
  if (array) arrayBounds = deriveBoundsFromPositionArray(array, itemSize);

  const box = asRecord<GeometryBoundingBoxLike>(geometry.boundingBox);
  const boxMin = box ? readRoundedTriplet(box.min) : null;
  const boxMax = box ? readRoundedTriplet(box.max) : null;
  const boxIsFinite =
    !!boxMin && !!boxMax && countInvalidTriplet(boxMin) === 0 && countInvalidTriplet(boxMax) === 0;
  const bounds = boxIsFinite
    ? { min: boxMin!, max: boxMax! }
    : arrayBounds
      ? { min: arrayBounds.min, max: arrayBounds.max }
      : null;

  const invalidNumberCount = arrayBounds?.invalidNumberCount ?? 0;
  return {
    vertexCount,
    invalidNumberCount,
    bounds,
    canonical: `vc=${vertexCount};b=${bounds ? `${formatTriplet(bounds.min)}>${formatTriplet(bounds.max)}` : '-'}`,
  };
}

function hashCanonicalText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildSummary(args: {
  nodeCount: number;
  visibleNodeCount: number;
  meshCount: number;
  geometryCount: number;
  partNodeCount: number;
  uniquePartCount: number;
  vertexCount: number;
  invalidNumberCount: number;
  maxDepth: number;
}): WardrobeProDebugSceneGeometrySummary {
  return { ...args };
}

export function createSceneGeometrySnapshot(
  root: Object3DLike | null | undefined
): WardrobeProDebugSceneGeometrySnapshot | null {
  if (!root || typeof root !== 'object') return null;

  const canonicalEntries: string[] = [];
  const violations: string[] = [];
  const partIds = new Set<string>();
  const seen = new Set<object>();
  const stack: Array<{ node: SceneNodeLike; depth: number }> = [{ node: root as SceneNodeLike, depth: 0 }];

  let nodeCount = 0;
  let visibleNodeCount = 0;
  let meshCount = 0;
  let geometryCount = 0;
  let partNodeCount = 0;
  let vertexCount = 0;
  let invalidNumberCount = 0;
  let maxDepth = 0;

  while (stack.length > 0) {
    if (nodeCount >= MAX_TRAVERSED_NODES) {
      pushViolation(violations, `scene: traversal exceeded ${MAX_TRAVERSED_NODES} nodes`);
      break;
    }

    const current = stack.pop();
    if (!current) break;
    const { node, depth } = current;
    if (seen.has(node)) {
      pushViolation(violations, `scene: duplicate node reference at ${readNodeIdentity(node)}`);
      continue;
    }
    seen.add(node);

    nodeCount += 1;
    maxDepth = Math.max(maxDepth, depth);
    if (node.visible !== false) visibleNodeCount += 1;
    if (node.isMesh === true) meshCount += 1;

    const identity = readNodeIdentity(node);
    const partId = readPartId(node);
    if (partId) {
      partNodeCount += 1;
      partIds.add(partId);
    }

    const position = readRoundedTriplet(node.position);
    const rotation = readRoundedTriplet(node.rotation);
    const scale = readRoundedTriplet(node.scale);
    const transformInvalid =
      countInvalidTriplet(position) + countInvalidTriplet(rotation) + countInvalidTriplet(scale);
    if (transformInvalid > 0) {
      invalidNumberCount += transformInvalid;
      pushViolation(violations, `node:${identity}: non-finite transform`);
    }

    const geometry = asRecord<GeometryLike>(node.geometry);
    let geometryCanonical = 'g=-';
    if (geometry) {
      geometryCount += 1;
      const geometryScan = scanGeometry(geometry);
      vertexCount += geometryScan.vertexCount;
      invalidNumberCount += geometryScan.invalidNumberCount;
      geometryCanonical = `g=${geometryScan.canonical}`;
      if (geometryScan.invalidNumberCount > 0) {
        pushViolation(
          violations,
          `geometry:${identity}: ${geometryScan.invalidNumberCount} non-finite position values`
        );
      }
      if (geometryScan.bounds) {
        const { min, max } = geometryScan.bounds;
        if (
          min.x !== null &&
          min.y !== null &&
          min.z !== null &&
          max.x !== null &&
          max.y !== null &&
          max.z !== null &&
          (min.x > max.x || min.y > max.y || min.z > max.z)
        ) {
          pushViolation(violations, `geometry:${identity}: inverted local bounds`);
        }
      }
    }

    canonicalEntries.push(
      [
        `id=${identity}`,
        `part=${partId || '-'}`,
        `visible=${node.visible === false ? 0 : 1}`,
        `mesh=${node.isMesh === true ? 1 : 0}`,
        `p=${formatTriplet(position)}`,
        `r=${formatTriplet(rotation)}`,
        `s=${formatTriplet(scale)}`,
        geometryCanonical,
      ].join(';')
    );

    const children = Array.isArray(node.children) ? node.children : [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child && typeof child === 'object') stack.push({ node: child as SceneNodeLike, depth: depth + 1 });
    }
  }

  canonicalEntries.sort();
  const sortedPartIds = [...partIds].toSorted();
  const summary = buildSummary({
    nodeCount,
    visibleNodeCount,
    meshCount,
    geometryCount,
    partNodeCount,
    uniquePartCount: sortedPartIds.length,
    vertexCount,
    invalidNumberCount,
    maxDepth,
  });
  const canonical = [
    `v=${SNAPSHOT_VERSION}`,
    `nodes=${summary.nodeCount}`,
    `visible=${summary.visibleNodeCount}`,
    `meshes=${summary.meshCount}`,
    `geometries=${summary.geometryCount}`,
    `parts=${summary.partNodeCount}/${summary.uniquePartCount}`,
    `vertices=${summary.vertexCount}`,
    ...canonicalEntries,
  ].join('\n');

  return {
    version: SNAPSHOT_VERSION,
    fingerprint: `scene-v${SNAPSHOT_VERSION}-${hashCanonicalText(canonical)}`,
    rootName: readIdentityValue((root as SceneNodeLike).name),
    summary,
    partIds: sortedPartIds,
    violations,
  };
}
