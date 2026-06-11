import { getTools } from '../runtime/service_access.js';
import { asRecord } from '../runtime/record.js';
import { readModeStateFromApp, readUiStateFromApp } from '../runtime/root_state_access.js';
import type {
  AppContainer,
  CanvasPickingGridInfoLike,
  HoverCustomDataLike,
  HoverModuleConfigLike,
  LayoutManualTool,
  ShelfVariant,
  UiStateLike,
} from './canvas_picking_interior_hover_contracts.js';
import type { UnknownRecord } from '../../../types';

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function asGridInfo(value: unknown): CanvasPickingGridInfoLike | null {
  const rec = asRecord<CanvasPickingGridInfoLike>(value);
  return rec ? { ...rec } : null;
}

export function asHoverModuleConfig(value: unknown): HoverModuleConfigLike | null {
  const rec = asRecord<HoverModuleConfigLike>(value);
  return rec ? { ...rec } : null;
}

export function readModeOpts(App: AppContainer): UnknownRecord {
  const mode = readModeStateFromApp(App);
  const opts = mode && typeof mode === 'object' ? mode.opts : null;
  return asRecord(opts) ?? {};
}

export function readUiState(App: AppContainer): UiStateLike {
  return readUiStateFromApp(App);
}

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? String(value) : fallback;
}

export function readGridDivisions(value: unknown, fallback = 6, max = 12): number {
  const divsRaw = readNumber(value);
  return Number.isFinite(divsRaw) && Number(divsRaw) >= 2 && Number(divsRaw) <= max
    ? Math.floor(Number(divsRaw))
    : fallback;
}

export function readShelfVariant(value: unknown): ShelfVariant {
  const raw = readString(value, 'regular');
  return raw === 'double' || raw === 'glass' || raw === 'brace' || raw === 'regular' ? raw : 'regular';
}

export function readBooleanArray(value: unknown): boolean[] {
  if (!Array.isArray(value)) return [];
  return value.map(v => !!v);
}

export function readNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const n = readNumber(value[i]);
    if (n != null) out.push(n);
  }
  return out;
}

export function asHoverCustomData(value: unknown): HoverCustomDataLike | null {
  const rec = asRecord<HoverCustomDataLike>(value);
  return rec ? { ...rec } : null;
}

export function readCustomData(cfgRef: HoverModuleConfigLike | null): HoverCustomDataLike | null {
  return cfgRef ? asHoverCustomData(cfgRef.customData) : null;
}

export function readBraceShelves(cfgRef: HoverModuleConfigLike | null): number[] {
  return readNumberArray(cfgRef?.braceShelves);
}

export function readIntDrawerSlots(cfgRef: HoverModuleConfigLike | null): number[] {
  return readNumberArray(cfgRef?.intDrawersList);
}

export function readIntDrawerSlot(cfgRef: HoverModuleConfigLike | null): number | null {
  return readNumber(cfgRef?.intDrawersSlot);
}

export function readLayoutType(App: AppContainer): string {
  const modeOpts = readModeOpts(App);
  const layoutType = readString(modeOpts.layoutType);
  if (layoutType) return layoutType;
  const ui = readUiState(App);
  return readString(ui.currentLayoutType, 'shelves');
}

export function readManualTool(App: AppContainer): LayoutManualTool | '' {
  const tools = getTools(App);
  const toolFromService =
    typeof tools.getInteriorManualTool === 'function' ? tools.getInteriorManualTool() : null;
  const toolRaw =
    toolFromService == null || toolFromService === '' ? readModeOpts(App).manualTool : toolFromService;
  const tool = readString(toolRaw);
  return tool === 'shelf' || tool === 'rod' || tool === 'storage' ? tool : '';
}
