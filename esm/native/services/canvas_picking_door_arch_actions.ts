import type { AppContainer, GrooveLayoutEntry, MirrorLayoutEntry, ThreeLike } from '../../../types';
import type { DoorArchRect, DoorCurveShape } from '../../../types/maps.js';
import {
  doorArchCutRange,
  doorArchesOverlap,
  MIN_DOOR_ARCH_CUT_MARGIN_M,
  normalizeKnownMapSnapshot,
  readDoorArchCut,
  readMirrorLayoutFaceSign,
  resolveGroovePlacementInRect,
  resolveMirrorPlacementInRect,
  resolvePendingGrooveLinesCount,
  writeDoorArchMaps,
  type DoorArchTool,
} from './canvas_picking_door_edit_shared.js';
import {
  __wp_getRegularSplitPreviewLineY,
  __wp_historyBatch,
  __wp_map,
  __wp_ui,
} from './canvas_picking_core_helpers.js';
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
  type DoorArchTarget,
} from './canvas_picking_door_arch_target.js';
import {
  isCanvasDoorSplitBottomEnabled,
  isCanvasDoorSplitExplicit,
  readCanvasDoorSplitPosList,
} from './canvas_picking_door_split_click_shared.js';
import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { RaycasterLike } from './canvas_picking_engine.js';

type SurfaceEntry = MirrorLayoutEntry | GrooveLayoutEntry;
type ArchRemoval = { key: string; index: number; slice?: DoorArchSlice };
export type DoorArchAction =
  | { kind: 'add'; tool: DoorArchTool; slices: DoorArchSlice[]; replaceEntries?: ArchRemoval[] }
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
  shape: DoorCurveShape;
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
    const surfaceEntries: Record<string, SurfaceEntry[] | undefined> = map;
    const current = surfaceEntries[target.surface.key] ?? [];
    const matchIndex = current.findIndex(entry => {
      const slice = readSurfaceSlice(target.surface, entry, tool);
      return slice && hitsDoorArchSlice(slice, target.point, tool);
    });
    if (matchIndex >= 0) {
      const link = current[matchIndex]?.arch?.link;
      const entries = Object.entries(surfaceEntries).flatMap(([key, layouts]) =>
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
    shape: args.shape,
    target,
    widthCm: tool === 'mirror' ? ui.currentMirrorDraftWidthCm : ui.currentGrooveDraftWidthCm,
    heightCm: tool === 'groove' ? ui.currentGrooveDraftHeightCm : ui.currentMirrorDraftHeightCm,
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
  if (!slices.length || (tool === 'cut' && slices.some(slice => !fitsArchAmongStraightCuts(App, slice))))
    return null;
  return tool === 'groove' ? resolveGrooveArchChange(App, target, slices) : { kind: 'add', tool, slices };
}

function fitsArchAmongStraightCuts(App: AppContainer, slice: DoorArchSlice): boolean {
  const { surface } = slice;
  const doorBaseKey = surface.key.slice('splitarch_'.length);
  const { rect } = surface;
  const height = rect.maxY - rect.minY;
  const [low, high] = doorArchCutRange(rect, makeDoorArchCut(slice));
  const isClear = (y: number) =>
    y <= low - MIN_DOOR_ARCH_CUT_MARGIN_M || y >= high + MIN_DOOR_ARCH_CUT_MARGIN_M;
  const manual = readCanvasDoorSplitPosList(App, doorBaseKey);
  if (manual.some(norm => !isClear(rect.minY + norm * height))) return false;

  const point = surface.group.position.clone();
  const originY = surface.toWorld(point.set(0, 0, 0)).y;
  const bounds = { minY: originY + rect.minY, maxY: originY + rect.maxY };
  for (const bottom of [true, false]) {
    if (
      bottom
        ? !isCanvasDoorSplitBottomEnabled(App, doorBaseKey)
        : manual.length || !isCanvasDoorSplitExplicit(App, doorBaseKey)
    )
      continue;
    const line = __wp_getRegularSplitPreviewLineY({
      App,
      hitDoorGroup: surface.group,
      bounds,
      isBottomRegion: bottom,
    });
    if (line != null && !isClear(line - originY)) return false;
  }
  return true;
}

function resolveGrooveArchChange(
  App: AppContainer,
  target: DoorArchTarget,
  slices: DoorArchSlice[]
): DoorArchAction {
  const current = normalizeKnownMapSnapshot('grooveLayoutMap', __wp_map(App, 'grooveLayoutMap'));
  const overlaps: ArchRemoval[] = [];
  const links = new Set<string>();
  for (const next of slices) {
    const key = next.surface.key;
    current[key]?.forEach((entry, index) => {
      const slice = readSurfaceSlice(next.surface, entry, 'groove');
      if (!slice || !doorArchesOverlap(next, slice)) return;
      overlaps.push({ key, index, slice });
      if (entry.arch?.link) links.add(entry.arch.link);
    });
  }
  const entries = [...overlaps];
  if (links.size) {
    for (const [key, layouts] of Object.entries(current)) {
      layouts?.forEach((entry, index) => {
        if (
          !entry.arch?.link ||
          !links.has(entry.arch.link) ||
          entries.some(candidate => candidate.key === key && candidate.index === index)
        )
          return;
        const surface = target.allSurfaces.find(candidate => candidate.key === key);
        const slice = surface && readSurfaceSlice(surface, entry, 'groove');
        entries.push({ key, index, ...(slice ? { slice } : {}) });
      });
    }
  }
  return { kind: 'add', tool: 'groove', slices, replaceEntries: entries };
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

export function commitDoorArchAction(App: AppContainer, action: DoorArchAction): void {
  const source = `doorArch:${action.tool}:${action.kind}`;
  const structural = createCanvasPickingDoorAuthoringStructuralMeta(source);
  const meta = createCanvasPickingDoorAuthoringRefreshGatedMeta(App, source, structural);
  __wp_historyBatch(App, structural, () => {
    if (action.tool === 'cut') {
      const entries =
        action.kind === 'remove'
          ? action.entries.map(({ key }) => ({ key, value: null }))
          : action.slices.map(slice => ({ key: slice.surface.key, value: makeDoorArchCut(slice) }));
      writeDoorArchMaps(App, { tool: 'cut', entries }, meta);
    } else if (action.tool === 'mirror') {
      const entries =
        action.kind === 'remove'
          ? action.entries
          : action.slices.map(slice => ({
              key: slice.surface.key,
              value: {
                ...makeSurfaceLayout(slice),
                surfaceKind: 'mirror' as const,
                faceSign: slice.surface.face,
              },
            }));
      writeDoorArchMaps(App, { tool: 'mirror', entries }, meta);
    } else {
      const entries =
        action.kind === 'remove'
          ? action.entries
          : [
              ...(action.replaceEntries ?? []),
              ...action.slices.map(slice => {
                const { key } = slice.surface;
                const layout = makeSurfaceLayout(slice);
                const linesCount = resolvePendingGrooveLinesCount(App, layout.widthCm / 100, undefined, key);
                return { key, value: { ...layout, linesCount } };
              }),
            ];
      writeDoorArchMaps(App, { tool: 'groove', entries }, meta);
    }
  });
  requestDoorAuthoringImmediateRefresh(App, source);
}
