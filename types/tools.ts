// Tools surface types (cross-layer helper bag)
//
// Rationale:
// - Many services and UI modules access "tools" via getTools(App).
// - Historically this was an untyped helper bag, which led to widespread unchecked casts.
// - This interface captures the *real* methods used across the ESM layer, while remaining
//   permissive for gradual migration.

import type { UnknownRecord } from './common';
import type { ActionMetaLike } from './kernel';
import type { HandleType } from './domain';

export type DrawersOpenIdLike = string | number | null;

export interface ToolsNamespaceLike extends UnknownRecord {
  // Handles
  getHandlesType?: () => HandleType | string | null;
  setHandlesType?: (handleType: HandleType | string | null, meta?: ActionMetaLike) => unknown;

  // Interior manual layout tool
  getInteriorManualTool?: () => string | null;
  setInteriorManualTool?: (tool: string | null, meta?: ActionMetaLike) => unknown;

  // Paint selection
  getPaintColor?: () => string | null;
  setPaintColor?: (color: string | null, meta?: ActionMetaLike) => unknown;

  // Drawer selection / focus
  getDrawersOpenId?: () => DrawersOpenIdLike;
  setDrawersOpenId?: (id: DrawersOpenIdLike, meta?: ActionMetaLike) => unknown;

  [k: string]: unknown;
}
