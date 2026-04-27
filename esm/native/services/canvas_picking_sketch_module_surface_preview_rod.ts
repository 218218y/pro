import { findNearestSketchModuleRod } from './canvas_picking_sketch_module_vertical_content.js';
import {
  createRodRemoveHoverRecord,
  isRecord,
  readRecordArray,
  readRecordNumber,
  readRecordValue,
  type ResolveSketchModuleSurfacePreviewArgs,
  type SketchModuleSurfacePreviewResult,
} from './canvas_picking_sketch_module_surface_preview_shared.js';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function readRecordString(record: unknown, key: string): string | null {
  return readString(readRecordValue(record, key));
}

function readRecordEntry(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

type SketchModuleRodRemoveMatch = {
  removeKind: 'sketch' | 'base';
  removeIdx: number | null;
  rodIndex: number | null;
  yAbs: number;
  dy: number;
};

function resolvePresetRodPreviewMatch(args: {
  cfgRef: ResolveSketchModuleSurfacePreviewArgs['cfgRef'];
  info: ResolveSketchModuleSurfacePreviewArgs['info'];
  bottomY: number;
  spanH: number;
  pointerY: number;
}): SketchModuleRodRemoveMatch | null {
  const divs = readRecordNumber(args.info, 'gridDivisions') ?? 6;
  if (!(divs > 0)) return null;
  const step = args.spanH / divs;
  if (!(step > 0)) return null;

  const cfgRef = args.cfgRef;
  const isCustom = cfgRef ? readRecordValue(cfgRef, 'isCustom') === true : false;
  let best: SketchModuleRodRemoveMatch | null = null;

  const consider = (rodIndex: number, yAbs: number) => {
    if (!(rodIndex >= 1) || !(rodIndex <= divs) || !Number.isFinite(yAbs)) return;
    const dy = Math.abs(args.pointerY - yAbs);
    if (best && dy >= best.dy) return;
    best = {
      removeKind: 'base',
      removeIdx: null,
      rodIndex,
      yAbs,
      dy,
    };
  };

  if (isCustom) {
    const customData = cfgRef && typeof cfgRef === 'object' ? readRecordValue(cfgRef, 'customData') : null;
    const customDataRecord = customData && typeof customData === 'object' ? customData : null;
    const rods = readRecordArray(customDataRecord, 'rods');
    const rodOps = readRecordArray(customDataRecord, 'rodOps');
    const covered = new Set<number>();
    for (let i = 0; i < rodOps.length; i += 1) {
      const rodOp = readRecordEntry(rodOps[i]);
      if (!rodOp) continue;
      const rawYFactor = Number(rodOp.yFactor);
      if (!Number.isFinite(rawYFactor)) continue;
      const rawGridIndex = readRecordNumber(rodOp, 'gridIndex');
      const gridIndex =
        rawGridIndex != null
          ? Math.max(1, Math.min(divs, Math.round(rawGridIndex)))
          : Math.max(1, Math.min(divs, Math.round((rawYFactor * divs) / 6)));
      covered.add(gridIndex);
      const yAdd = readRecordNumber(rodOp, 'yAdd') ?? 0;
      consider(gridIndex, args.bottomY + rawYFactor * step + yAdd);
    }
    for (let i = 1; i <= divs; i += 1) {
      if (covered.has(i) || !rods[i - 1]) continue;
      consider(i, args.bottomY + i * step - 0.08);
    }
    return best;
  }

  const layout = readRecordString(cfgRef, 'layout') || 'shelves';
  const yFactors: number[] = [];
  switch (layout) {
    case 'mixed':
      yFactors.push(3.5);
      break;
    case 'hanging':
    case 'hanging_top2':
      yFactors.push(3.8);
      break;
    case 'hanging_split':
      yFactors.push(4.6, 2.3);
      break;
    case 'storage':
    case 'storage_shelf':
      yFactors.push(3.5);
      break;
    default:
      break;
  }

  for (let i = 0; i < yFactors.length; i += 1) {
    const yFactor = yFactors[i];
    const gridIndex = Math.max(1, Math.min(divs, Math.round(yFactor)));
    consider(gridIndex, args.bottomY + yFactor * step);
  }

  return best;
}

function resolveSketchModuleRodRemoveMatch(args: {
  cfgRef: ResolveSketchModuleSurfacePreviewArgs['cfgRef'];
  info: ResolveSketchModuleSurfacePreviewArgs['info'];
  bottomY: number;
  spanH: number;
  pointerY: number;
  rods: ResolveSketchModuleSurfacePreviewArgs['rods'];
}): SketchModuleRodRemoveMatch | null {
  let best: SketchModuleRodRemoveMatch | null = null;

  const sketchMatch = findNearestSketchModuleRod({
    rods: args.rods,
    bottomY: args.bottomY,
    totalHeight: args.spanH,
    pointerY: args.pointerY,
  });
  if (sketchMatch) {
    best = {
      removeKind: 'sketch',
      removeIdx: sketchMatch.index,
      rodIndex: null,
      yAbs: sketchMatch.yAbs,
      dy: sketchMatch.dy,
    };
  }

  const presetMatch = resolvePresetRodPreviewMatch({
    cfgRef: args.cfgRef,
    info: args.info,
    bottomY: args.bottomY,
    spanH: args.spanH,
    pointerY: args.pointerY,
  });
  if (presetMatch && (!best || presetMatch.dy < best.dy)) return presetMatch;
  return best;
}

export function resolveSketchModuleRodRemovePreview(args: {
  source: ResolveSketchModuleSurfacePreviewArgs;
  removeEpsShelf: number;
  bottomY: number;
  topY: number;
  pad: number;
  spanH: number;
  internalCenterX: number;
  internalZ: number;
  innerW: number;
  woodThick: number;
  yClamped: number;
  rods: ResolveSketchModuleSurfacePreviewArgs['rods'];
}): SketchModuleSurfacePreviewResult | null {
  const rodRemoveMatch = resolveSketchModuleRodRemoveMatch({
    cfgRef: args.source.cfgRef,
    info: args.source.info,
    bottomY: args.bottomY,
    spanH: args.spanH,
    pointerY: args.yClamped,
    rods: args.rods,
  });
  if (!rodRemoveMatch || rodRemoveMatch.dy > args.removeEpsShelf) return null;

  const previewY = Math.max(args.bottomY + args.pad, Math.min(args.topY - args.pad, rodRemoveMatch.yAbs));
  return {
    handled: true,
    hoverRecord: createRodRemoveHoverRecord({
      host: args.source.host,
      removeKind: rodRemoveMatch.removeKind,
      removeIdx: rodRemoveMatch.removeIdx,
      rodIndex: rodRemoveMatch.rodIndex,
    }),
    preview: {
      kind: 'rod',
      x: args.internalCenterX,
      y: previewY,
      z: args.internalZ,
      w: Math.max(0.05, args.innerW - 0.06),
      h: 0.03,
      d: 0.03,
      woodThick: args.woodThick,
      op: 'remove',
    },
  };
}
