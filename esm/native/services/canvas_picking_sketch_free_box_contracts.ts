import type { AppContainer } from '../../../types';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { SketchModuleBoxLike } from './canvas_picking_manual_layout_sketch_contracts.js';

import { asRecord } from '../runtime/record.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type ProjectWorldPointToLocalFn = (
  App: AppContainer,
  point: unknown,
  parentObj: unknown
) => { x: number; y: number; z: number } | null;

export type SketchFreePlacementBoxLike = SketchModuleBoxLike & {
  freePlacement: true;
};

export type ResolveSketchFreeBoxHoverPlacementArgs = {
  App: AppContainer;
  planeX: number;
  planeY: number;
  boxH: number;
  widthOverrideM?: number | null;
  depthOverrideM?: number | null;
  wardrobeBox: {
    centerX: number;
    centerY: number;
    centerZ: number;
    width: number;
    height: number;
    depth: number;
  };
  wardrobeBackZ: number;
  freeBoxes: unknown[];
  hostModuleKey?: ModuleKey | null;
  intersects?: RaycastHitLike[] | null;
  localParent?: unknown;
  projectWorldPointToLocal: ProjectWorldPointToLocalFn;
};

export function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asFiniteNumberOrNaN(value: unknown): number {
  return asNumberOrNull(value) ?? NaN;
}

function asSketchModuleBox(value: unknown): SketchModuleBoxLike | null {
  return asRecord<SketchModuleBoxLike>(value);
}

function isSketchFreePlacementBox(value: SketchModuleBoxLike): value is SketchFreePlacementBoxLike {
  return value.freePlacement === true;
}

export function asSketchFreePlacementBox(value: unknown): SketchFreePlacementBoxLike | null {
  const box = asSketchModuleBox(value);
  return box && isSketchFreePlacementBox(box) ? box : null;
}
