import type {
  AppContainer,
  WardrobeProGpuFingerprint,
  WardrobeProRendererInfoSnapshot,
  WardrobeProRendererProgramSnapshot,
  WardrobeProRendererProgramSnapshotEntry,
  WardrobeProSceneContentSnapshot,
} from '../../../types/index.js';

import { getMirrorRenderTarget, getRenderer, getWardrobeGroup } from './render_access.js';

type RecordLike = Record<string, unknown>;

function readRecord(value: unknown): RecordLike | null {
  return value !== null && typeof value === 'object' ? (value as RecordLike) : null;
}

function readFiniteCount(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function hashText(value: string | null): string | null {
  if (!value) return null;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function readProgramSnapshotEntry(value: unknown, index: number): WardrobeProRendererProgramSnapshotEntry {
  const program = readRecord(value);
  const idValue = Number(program?.id);
  const id = Number.isFinite(idValue) ? idValue : null;
  const cacheKey = readString(program?.cacheKey) || readString(program?.code);
  const cacheKeyHash = hashText(cacheKey);
  return {
    key: cacheKeyHash ? `cache:${cacheKeyHash}` : id !== null ? `id:${id}` : `index:${index}`,
    id,
    usedTimes: readFiniteCount(program?.usedTimes),
    name: readString(program?.name),
    cacheKeyHash,
  };
}

function call0(ctx: unknown, fn: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx) : undefined;
}

function call1(ctx: unknown, fn: unknown, value: unknown): unknown {
  return typeof fn === 'function' ? fn.call(ctx, value) : undefined;
}

function readGlString(gl: RecordLike, parameterName: string): string | null {
  const parameter = gl[parameterName];
  if (typeof parameter === 'undefined') return null;
  try {
    const value = call1(gl, gl.getParameter, parameter);
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

function readGlNumber(gl: RecordLike, parameterName: string): number {
  const parameter = gl[parameterName];
  if (typeof parameter === 'undefined') return 0;
  try {
    return readFiniteCount(call1(gl, gl.getParameter, parameter));
  } catch {
    return 0;
  }
}

function getExtension(gl: RecordLike, name: string): RecordLike | null {
  try {
    return readRecord(call1(gl, gl.getExtension, name));
  } catch {
    return null;
  }
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

export function getRendererProgramSnapshot(App: AppContainer): WardrobeProRendererProgramSnapshot | null {
  const renderer = readRecord(getRenderer(App));
  const info = readRecord(renderer?.info);
  if (!info) return null;
  const programs = Array.isArray(info.programs) ? info.programs : [];
  return {
    count: programs.length,
    programs: programs.map(readProgramSnapshotEntry),
  };
}

export function getGpuFingerprint(App: AppContainer, devicePixelRatio = 1): WardrobeProGpuFingerprint | null {
  const renderer = readRecord(getRenderer(App));
  const gl = readRecord(call0(renderer, renderer?.getContext));
  if (!renderer || !gl) return null;
  const debugRendererInfo = getExtension(gl, 'WEBGL_debug_renderer_info');
  const parallelShaderCompile = getExtension(gl, 'KHR_parallel_shader_compile');
  const renderTarget = readRecord(getMirrorRenderTarget(App));
  const mirrorCubeSize = readFiniteCount(renderTarget?.width || renderTarget?.height);
  const readDebugString = (parameterName: string): string | null => {
    const parameter = debugRendererInfo?.[parameterName];
    if (typeof parameter === 'undefined') return null;
    try {
      const value = call1(gl, gl.getParameter, parameter);
      return typeof value === 'string' && value ? value : null;
    } catch {
      return null;
    }
  };
  return {
    webglVersion: readGlString(gl, 'VERSION'),
    glslVersion: readGlString(gl, 'SHADING_LANGUAGE_VERSION'),
    vendor: readGlString(gl, 'VENDOR'),
    renderer: readGlString(gl, 'RENDERER'),
    unmaskedVendor: readDebugString('UNMASKED_VENDOR_WEBGL'),
    unmaskedRenderer: readDebugString('UNMASKED_RENDERER_WEBGL'),
    khrParallelShaderCompile: !!parallelShaderCompile,
    maxCubeMapTextureSize: readGlNumber(gl, 'MAX_CUBE_MAP_TEXTURE_SIZE'),
    devicePixelRatio: Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1,
    mirrorCubeSize,
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
    else if (kind !== 'folded_cloth_body' && kind.startsWith('folded_cloth_')) snapshot.foldedDetails += 1;
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
