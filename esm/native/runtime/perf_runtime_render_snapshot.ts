import type {
  AppContainer,
  WardrobeProRendererInfoSnapshot,
  WardrobeProSceneContentSnapshot,
} from '../../../types/index.js';

import { getRenderer, getWardrobeGroup } from './render_access.js';

type RecordLike = Record<string, unknown>;

function readRecord(value: unknown): RecordLike | null {
  return value !== null && typeof value === 'object' ? (value as RecordLike) : null;
}

function readFiniteCount(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

export function getRendererInfoSnapshot(App: AppContainer): WardrobeProRendererInfoSnapshot | null {
  const renderer = readRecord(getRenderer(App));
  const info = readRecord(renderer?.info);
  if (!info) return null;
  const render = readRecord(info.render);
  const memory = readRecord(info.memory);
  return {
    calls: readFiniteCount(render?.calls),
    triangles: readFiniteCount(render?.triangles),
    lines: readFiniteCount(render?.lines),
    points: readFiniteCount(render?.points),
    geometries: readFiniteCount(memory?.geometries),
    textures: readFiniteCount(memory?.textures),
    programs: Array.isArray(info.programs) ? info.programs.length : 0,
  };
}

export function getSceneContentSnapshot(App: AppContainer): WardrobeProSceneContentSnapshot | null {
  const root = readRecord(getWardrobeGroup(App));
  if (!root) return null;
  const snapshot: WardrobeProSceneContentSnapshot = {
    object3DCount: 0,
    meshCount: 0,
    books: 0,
    bookSpineBands: 0,
    foldedGarments: 0,
    foldedDetails: 0,
    hangingGarments: 0,
    hangingDetails: 0,
    hangers: 0,
    hangerObjects: 0,
    outlines: 0,
  };
  const pending: RecordLike[] = [root];
  const visited = new Set<RecordLike>();
  while (pending.length) {
    const node = pending.pop();
    if (!node || visited.has(node)) continue;
    visited.add(node);
    snapshot.object3DCount += 1;
    if (node.isMesh === true || node.type === 'Mesh') snapshot.meshCount += 1;
    if (node.isLine === true || node.isLineSegments === true || node.type === 'LineSegments') {
      snapshot.outlines += 1;
    }

    const userData = readRecord(node.userData);
    const kind = typeof userData?.__kind === 'string' ? userData.__kind : '';
    if (kind === 'library_book') snapshot.books += 1;
    else if (kind === 'library_book_spine_band') snapshot.bookSpineBands += 1;
    else if (kind === 'folded_cloth_item') snapshot.foldedGarments += 1;
    else if (kind.startsWith('folded_cloth_')) snapshot.foldedDetails += 1;
    else if (kind === 'hanging_cloth') snapshot.hangingGarments += 1;
    else if (kind.startsWith('hanging_cloth_')) snapshot.hangingDetails += 1;
    else if (kind === 'hanging_hanger') snapshot.hangers += 1;
    if (kind.startsWith('hanging_hanger')) snapshot.hangerObjects += 1;

    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
      const childRecord = readRecord(child);
      if (childRecord) pending.push(childRecord);
    }
  }
  return snapshot;
}
