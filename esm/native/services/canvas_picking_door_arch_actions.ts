import type { AppContainer, GrooveLayoutEntry, MirrorLayoutEntry, ThreeLike } from '../../../types';
import type { DoorArchRect } from '../../../types/maps.js';
import {
  normalizeKnownMapSnapshot,
  readDoorArchCut,
  readMirrorLayoutFaceSign,
  resolveGroovePlacementInRect,
  resolveMirrorPlacementInRect,
  resolvePendingGrooveLinesCount,
  toCanonicalGroovesMapKey,
  writeDoorArchMaps,
} from './canvas_picking_door_edit_shared.js';
import { __wp_historyBatch, __wp_map, __wp_ui } from './canvas_picking_core_helpers.js';
import {
  createCanvasPickingDoorAuthoringRefreshGatedMeta,
  createCanvasPickingDoorAuthoringStructuralMeta,
} from './canvas_picking_door_authoring_meta.js';
import { requestDoorAuthoringImmediateRefresh } from './canvas_picking_door_authoring_burst.js';
import {
  hitsDoorArchSlice,
  makeDoorArchCut,
  planDoorArch,
  readDoorArchCutSlice,
  resolveDoorArchTarget,
  type ArchSurface,
  type DoorArchSlice,
  type DoorArchTool,
} from './canvas_picking_door_arch_target.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { RaycasterLike } from './canvas_picking_engine.js';

type SurfaceEntry = MirrorLayoutEntry | GrooveLayoutEntry;
type ArchRemoval = { key: string; index: number; slice?: DoorArchSlice };
export type DoorArchAction =
  | { kind: 'add'; tool: DoorArchTool; slices: DoorArchSlice[] }
  | { kind: 'remove'; tool: DoorArchTool; slices: DoorArchSlice[]; entries: ArchRemoval[] };

function centeredRect(x: number, y: number, width: number, height: number): DoorArchRect {
  return { minX: x - width / 2, maxX: x + width / 2, minY: y - height / 2, maxY: y + height / 2 };
}

function readSurfaceSlice(
  surface: ArchSurface,
  entry: SurfaceEntry,
  tool: DoorArchTool
): DoorArchSlice | null {
  if (!entry.arch) return null;
  if (tool === 'mirror') {
    if (readMirrorLayoutFaceSign(entry) !== surface.face) return null;
    const placement = resolveMirrorPlacementInRect({ rect: surface.rect, layout: entry });
    return {
      surface,
      profile: entry.arch,
      rect: centeredRect(
        placement.centerX,
        placement.centerY,
        placement.mirrorWidthM,
        placement.mirrorHeightM
      ),
    };
  }
  const placement = resolveGroovePlacementInRect({ rect: surface.rect, layout: entry });
  return {
    surface,
    profile: entry.arch,
    rect: centeredRect(placement.centerX, placement.centerY, placement.widthM, placement.heightM),
  };
}

export function resolveDoorArchAction(args: {
  App: AppContainer;
  THREE: ThreeLike;
  tool: DoorArchTool;
  hit: CanvasPickingClickHitState | null;
  raycaster: RaycasterLike;
}): DoorArchAction | null {
  const { App, tool } = args;
  const target = resolveDoorArchTarget(args);
  if (!target) return null;
  if (tool === 'cut') {
    const map = __wp_map(App, 'splitDoorsMap');
    const match = readDoorArchCutSlice(target.surface, map[target.surface.key]);
    if (match && hitsDoorArchSlice(match, target.point, tool)) {
      const link = match.profile.link;
      const keys = Object.keys(map).filter(
        key => key === target.surface.key || (link && readDoorArchCut(map[key])?.profile.link === link)
      );
      const slices = keys.flatMap(key => {
        const surface = target.allSurfaces.find(candidate => candidate.key === key);
        const slice = surface && readDoorArchCutSlice(surface, map[key]);
        return slice ? [slice] : [];
      });
      return { kind: 'remove', tool, slices, entries: keys.map(key => ({ key, index: 0 })) };
    }
    if (target.surfaces.some(({ surface }) => readDoorArchCut(map[surface.key]))) return null;
  } else {
    const map =
      tool === 'mirror'
        ? normalizeKnownMapSnapshot('mirrorLayoutMap', __wp_map(App, 'mirrorLayoutMap'))
        : normalizeKnownMapSnapshot('grooveLayoutMap', __wp_map(App, 'grooveLayoutMap'));
    const current = map[target.surface.key] ?? [];
    const matchIndex = current.findIndex(entry => {
      const slice = readSurfaceSlice(target.surface, entry, tool);
      return slice && hitsDoorArchSlice(slice, target.point, tool);
    });
    if (matchIndex >= 0) {
      const link = current[matchIndex]?.arch?.link;
      const entries = Object.entries(map).flatMap(([key, layouts]) =>
        (layouts ?? []).flatMap((entry: SurfaceEntry, index: number): ArchRemoval[] => {
          if (!(key === target.surface.key && index === matchIndex) && !(link && entry.arch?.link === link))
            return [];
          const surface = target.allSurfaces.find(candidate => candidate.key === key);
          const slice = surface && readSurfaceSlice(surface, entry, tool);
          return [{ key, index, ...(slice ? { slice } : {}) }];
        })
      );
      return {
        kind: 'remove',
        tool,
        entries,
        slices: entries.flatMap(entry => (entry.slice ? [entry.slice] : [])),
      };
    }
  }
  const ui = __wp_ui(App);
  const slices = planDoorArch({
    tool,
    target,
    widthCm: tool === 'mirror' ? ui.currentMirrorDraftWidthCm : ui.currentGrooveDraftWidthCm,
    heightCm: ui.currentMirrorDraftHeightCm,
  });
  // A front-side mirror and a CNC region cannot occupy the same face.
  if (
    slices.some(({ surface }) => {
      const opposite = tool === 'mirror' ? 'grooveLayoutMap' : 'mirrorLayoutMap';
      if (tool === 'cut') return false;
      const layouts = normalizeKnownMapSnapshot(opposite, __wp_map(App, opposite))[surface.key];
      return (
        surface.face === 1 &&
        layouts?.some(entry => opposite === 'grooveLayoutMap' || readMirrorLayoutFaceSign(entry) === 1)
      );
    })
  )
    return null;
  return slices.length ? { kind: 'add', tool, slices } : null;
}

function makeSurfaceLayout(slice: DoorArchSlice) {
  const { rect, surface, profile } = slice;
  return {
    widthCm: (rect.maxX - rect.minX) * 100,
    heightCm: (rect.maxY - rect.minY) * 100,
    centerXNorm: ((rect.minX + rect.maxX) / 2 - surface.rect.minX) / (surface.rect.maxX - surface.rect.minX),
    centerYNorm: ((rect.minY + rect.maxY) / 2 - surface.rect.minY) / (surface.rect.maxY - surface.rect.minY),
    arch: profile,
  };
}

function removeSurfaceArches<T extends SurfaceEntry>(
  map: Record<string, T[] | undefined>,
  entries: ArchRemoval[]
): void {
  for (const key of new Set(entries.map(entry => entry.key))) {
    const next = map[key]?.filter(
      (_layout, index) => !entries.some(entry => entry.key === key && entry.index === index)
    );
    if (next?.length) map[key] = next;
    else delete map[key];
  }
}

export function commitDoorArchAction(App: AppContainer, action: DoorArchAction): void {
  const source = `doorArch:${action.tool}:${action.kind}`;
  const structural = createCanvasPickingDoorAuthoringStructuralMeta(source);
  const meta = createCanvasPickingDoorAuthoringRefreshGatedMeta(App, source, structural);
  __wp_historyBatch(App, structural, () => {
    if (action.tool === 'cut') {
      const splitDoorsMap = normalizeKnownMapSnapshot('splitDoorsMap', __wp_map(App, 'splitDoorsMap'));
      if (action.kind === 'remove') {
        for (const entry of action.entries) delete splitDoorsMap[entry.key];
      } else {
        for (const slice of action.slices) splitDoorsMap[slice.surface.key] = makeDoorArchCut(slice);
      }
      writeDoorArchMaps(App, { splitDoorsMap }, meta);
    } else if (action.tool === 'mirror') {
      const mirrorLayoutMap = normalizeKnownMapSnapshot('mirrorLayoutMap', __wp_map(App, 'mirrorLayoutMap'));
      if (action.kind === 'remove') {
        removeSurfaceArches(mirrorLayoutMap, action.entries);
      } else {
        for (const slice of action.slices) {
          const { key, face } = slice.surface;
          mirrorLayoutMap[key] = [
            ...(mirrorLayoutMap[key] ?? []),
            {
              ...makeSurfaceLayout(slice),
              surfaceKind: 'mirror',
              faceSign: face,
            },
          ];
        }
      }
      writeDoorArchMaps(App, { mirrorLayoutMap }, meta);
    } else {
      const grooveLayoutMap = normalizeKnownMapSnapshot('grooveLayoutMap', __wp_map(App, 'grooveLayoutMap'));
      const groovesMap = normalizeKnownMapSnapshot('groovesMap', __wp_map(App, 'groovesMap'));
      if (action.kind === 'remove') {
        removeSurfaceArches(grooveLayoutMap, action.entries);
        for (const { key } of action.entries) {
          if (!grooveLayoutMap[key]) groovesMap[toCanonicalGroovesMapKey(key)] = false;
        }
      } else {
        for (const slice of action.slices) {
          const { key } = slice.surface;
          const layout = makeSurfaceLayout(slice);
          const count = resolvePendingGrooveLinesCount(App, layout.widthCm / 100, undefined, key);
          grooveLayoutMap[key] = [...(grooveLayoutMap[key] ?? []), { ...layout, linesCount: count }];
          groovesMap[toCanonicalGroovesMapKey(key)] = true;
        }
      }
      writeDoorArchMaps(App, { grooveLayoutMap, groovesMap }, meta);
    }
  });
  requestDoorAuthoringImmediateRefresh(App, source);
}
