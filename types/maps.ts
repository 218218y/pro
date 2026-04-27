// Maps typing (high-value boundary)
//
// Goal:
// - Provide stable, explicit typing for the named App/maps/config "maps" surfaces.
// - Enable typed helpers (readMap/readMapOrEmpty) to return useful record shapes
//   without forcing a full rewrite of internal values.
//
// Notes:
// - Values are intentionally permissive (unknown unions) because legacy payloads can
//   still contain historical encodings. Canonical parsing/normalization lives in
//   runtime helpers (e.g. maps_access.ts + project_schema.ts).

import type { UnknownRecord } from './common';
import type { HandleType, HingeDir } from './domain';

/** Base id used in part keys (doors, drawers, etc). */
export type PartId = string;

// --- Canonical dynamic keys used by door maps --------------------------------

export type SplitDoorKey = `split_${PartId}`;
export type SplitPosKey = `splitpos_${PartId}`;
export type SplitBottomKey = `splitb_${PartId}`;
export type RemovedDoorKey = `removed_${PartId}`;

// --- Common value domains ----------------------------------------------------

/** Toggle-like map values as seen in legacy payloads and canonical writes. */
export type ToggleValue = true | false | null | 1 | 0;

/** Generic toggle map (presence/true means ON, null/false means OFF). */
export type ToggleMap = Record<string, ToggleValue | undefined>;

/** Handles: global handle type or per-part overrides. */
export type HandlesMap = Record<string, HandleType | string | null | undefined>;

/** Hinges: hinge direction or a legacy object payload. */
export type HingeMap = Record<string, HingeDir | string | UnknownRecord | null | undefined>;

/** Split doors: toggles + split positions (pos is canonical number[] but legacy can be number/string). */
export type SplitDoorsMap = Record<string, boolean | number[] | number | string | null | undefined>;

/** Bottom split: toggle surface. */
export type SplitDoorsBottomMap = ToggleMap;

/** Drawer dividers: toggle surface. */
export type DrawerDividersMap = ToggleMap;

/** Grooves: toggle surface. */
export type GroovesMap = ToggleMap;

/** Per-part groove lines count override. */
export type GrooveLinesCountMap = Record<string, number | null | undefined>;

/** Removed doors: toggle surface. */
export type RemovedDoorsMap = ToggleMap;

/** Curtains: per-part selection (string or null). */
export type CurtainMap = Record<string, string | null | undefined>;

/** Per-part paint selection (wood/frame colors only; mirror/glass move to doorSpecialMap). */
export type IndividualColorsMap = Record<string, string | null | undefined>;

/** Special door material/type selection. */
export type DoorSpecialValue = 'mirror' | 'glass' | string | null;
export type DoorSpecialMap = Record<string, DoorSpecialValue | undefined>;

/** Per-part door/drawer front style override. */
export type DoorStyleMap = Record<string, 'flat' | 'profile' | 'tom' | undefined>;

/** Optional per-door mirror sizing / placement (persisted in cm + normalized anchor). */
export interface MirrorLayoutEntry extends UnknownRecord {
  widthCm?: number | null;
  heightCm?: number | null;
  centerXNorm?: number | null;
  centerYNorm?: number | null;
  faceSign?: number | null;
}
export type MirrorLayoutList = MirrorLayoutEntry[];
export type MirrorLayoutMap = Record<string, MirrorLayoutList | undefined>;

/** Decorative metal trim strips placed over a door leaf. */
export type DoorTrimAxis = 'horizontal' | 'vertical';
export type DoorTrimColor = 'nickel' | 'silver' | 'gold' | 'black';
export type DoorTrimSpan = 'full' | 'three_quarters' | 'half' | 'third' | 'quarter' | 'custom';
export interface DoorTrimEntry extends UnknownRecord {
  id: string;
  axis: DoorTrimAxis;
  color: DoorTrimColor;
  span: DoorTrimSpan;
  /** Span along the trim axis (width for horizontal, height for vertical). */
  sizeCm?: number | null;
  /** Cross-axis breadth / face width of the trim (height for horizontal, width for vertical). */
  crossSizeCm?: number | null;
  /** Legacy axis-specific center value kept for backward compatibility. */
  centerNorm: number;
  /** Absolute normalized X position inside the door leaf (0..1). */
  centerXNorm?: number | null;
  /** Absolute normalized Y position inside the door leaf (0..1). */
  centerYNorm?: number | null;
}
export type DoorTrimList = DoorTrimEntry[];
export type DoorTrimMap = Record<string, DoorTrimList | undefined>;

// --- Named map registry ------------------------------------------------------

/** Known named map objects that appear on App.maps and/or config snapshots. */
export interface MapsByName {
  handlesMap: HandlesMap;
  hingeMap: HingeMap;

  splitDoorsMap: SplitDoorsMap;
  splitDoorsBottomMap: SplitDoorsBottomMap;

  drawerDividersMap: DrawerDividersMap;
  groovesMap: GroovesMap;
  grooveLinesCountMap: GrooveLinesCountMap;
  removedDoorsMap: RemovedDoorsMap;

  curtainMap: CurtainMap;
  individualColors: IndividualColorsMap;
  doorSpecialMap: DoorSpecialMap;
  doorStyleMap: DoorStyleMap;
  mirrorLayoutMap: MirrorLayoutMap;
  doorTrimMap: DoorTrimMap;
}

export type KnownMapName = keyof MapsByName;
