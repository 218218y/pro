import type { ModuleKey } from './canvas_picking_manual_layout_sketch_contracts.js';

type RecordMap = Record<string, unknown>;

type SketchFreePlacementHostLike = {
  moduleKey: ModuleKey;
  isBottom: boolean;
};

type ToModuleKeyFn = (value: unknown) => ModuleKey | null;

type MatchRecentSketchHoverArgs = {
  hover: unknown;
  tool: string;
  kind?: string | null;
  contentKind?: string | null;
  host?: SketchFreePlacementHostLike | null;
  toModuleKey?: ToModuleKeyFn | null;
  requireFreePlacement?: boolean;
  maxAgeMs?: number;
};

function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): RecordMap | null {
  return isRecord(value) ? value : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRecordValue(record: RecordMap | null, key: string): unknown {
  return record ? record[key] : null;
}

export function readSketchHoverRecord(hover: unknown): RecordMap | null {
  return asRecord(hover);
}

export function isRecentSketchHoverForTool(hover: unknown, tool: string, maxAgeMs = 900): boolean {
  const hoverRec = readSketchHoverRecord(hover);
  if (!hoverRec || !tool) return false;
  const hoverTool = readString(hoverRec.tool);
  const hoverTs = readNumber(hoverRec.ts);
  return hoverTool === tool && hoverTs != null && Date.now() - hoverTs <= maxAgeMs;
}

export function readSketchHoverHostModuleKey(hover: unknown, toModuleKey: ToModuleKeyFn): ModuleKey | null {
  const hoverRec = readSketchHoverRecord(hover);
  if (!hoverRec) return null;
  return toModuleKey(readRecordValue(hoverRec, 'hostModuleKey') ?? readRecordValue(hoverRec, 'moduleKey'));
}

export function readSketchHoverHostIsBottom(hover: unknown): boolean {
  const hoverRec = readSketchHoverRecord(hover);
  if (!hoverRec) return false;
  return readRecordValue(hoverRec, 'hostIsBottom') != null
    ? !!readRecordValue(hoverRec, 'hostIsBottom')
    : !!readRecordValue(hoverRec, 'isBottom');
}

export function matchRecentSketchHover(args: MatchRecentSketchHoverArgs): RecordMap | null {
  const {
    hover,
    tool,
    kind = null,
    contentKind = null,
    host = null,
    toModuleKey = null,
    requireFreePlacement = false,
    maxAgeMs = 900,
  } = args;
  const hoverRec = readSketchHoverRecord(hover);
  if (!hoverRec || !isRecentSketchHoverForTool(hoverRec, tool, maxAgeMs)) return null;
  if (kind != null && readString(hoverRec.kind) !== kind) return null;
  if (contentKind != null && readString(hoverRec.contentKind) !== contentKind) return null;
  if (requireFreePlacement && hoverRec.freePlacement !== true) return null;
  if (host) {
    if (!toModuleKey) return null;
    const hoverHostModuleKey = readSketchHoverHostModuleKey(hoverRec, toModuleKey);
    const hoverHostIsBottom = readSketchHoverHostIsBottom(hoverRec);
    if (hoverHostModuleKey !== host.moduleKey || hoverHostIsBottom !== host.isBottom) return null;
  }
  return hoverRec;
}
