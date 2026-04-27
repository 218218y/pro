import {
  ensureSketchExtrasList,
  type ManualLayoutConfigRecord,
  type ManualLayoutExtraListKey,
} from './canvas_picking_manual_layout_config_ops_shared.js';

export function removeManualLayoutSketchExtraByIndex(
  cfg: ManualLayoutConfigRecord,
  key: ManualLayoutExtraListKey,
  index: number
): void {
  const list = ensureSketchExtrasList(cfg, key);
  if (Number.isFinite(index) && index >= 0 && index < list.length) list.splice(index, 1);
}
