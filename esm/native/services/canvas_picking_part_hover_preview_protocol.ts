export type PartHoverPreviewOp = 'add' | 'remove';
export type PartHoverPreviewKind = 'box' | 'object_boxes' | 'cell_layout';
export type PartHoverPreviewClearScope = 'none' | 'layout' | 'sketch' | 'layout-and-sketch';

export type PartHoverPreviewCommandBase = {
  anchor: unknown;
  anchorParent: unknown;
  op: PartHoverPreviewOp;
  x: number;
  y: number;
  z: number;
  w: number;
  boxH: number;
  d: number;
  woodThick: number;
  fillFront: boolean;
  fillBack: boolean;
  overlayThroughScene: boolean;
};

export type PartHoverBoxPreviewCommand = PartHoverPreviewCommandBase & {
  kind: 'box';
};

export type PartHoverObjectBoxesPreviewCommand = PartHoverPreviewCommandBase & {
  kind: 'object_boxes';
  previewObjects: readonly unknown[];
};

export type PartHoverCellLayoutPreviewBox = {
  x: number;
  y: number;
  z: number;
  w: number;
  boxH: number;
  d: number;
  selected: boolean;
  doorCount: number;
};

export type PartHoverCellLayoutPreviewCommand = PartHoverPreviewCommandBase & {
  kind: 'cell_layout';
  cellLayoutBoxes: readonly PartHoverCellLayoutPreviewBox[];
  isolateWardrobe: boolean;
};

export type PartHoverPreviewCommand =
  PartHoverBoxPreviewCommand | PartHoverObjectBoxesPreviewCommand | PartHoverCellLayoutPreviewCommand;

export type PartHoverPreviewDecision =
  | {
      type: 'clear';
      clearScope: Exclude<PartHoverPreviewClearScope, 'none'>;
      reason: string;
    }
  | {
      type: 'show';
      clearScope: PartHoverPreviewClearScope;
      reason: string;
      command: PartHoverPreviewCommand;
    };

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function validatePartHoverPreviewCommand(command: PartHoverPreviewCommand): string[] {
  const violations: string[] = [];
  if (!Number.isFinite(command.x)) violations.push('x must be finite');
  if (!Number.isFinite(command.y)) violations.push('y must be finite');
  if (!Number.isFinite(command.z)) violations.push('z must be finite');
  if (!isFinitePositive(command.w)) violations.push('w must be positive and finite');
  if (!isFinitePositive(command.boxH)) violations.push('boxH must be positive and finite');
  if (!isFinitePositive(command.d)) violations.push('d must be positive and finite');
  if (!isFinitePositive(command.woodThick)) violations.push('woodThick must be positive and finite');
  if (command.kind === 'object_boxes' && command.previewObjects.length === 0) {
    violations.push('object_boxes preview requires at least one preview object');
  }
  if (command.kind === 'cell_layout') {
    if (command.cellLayoutBoxes.length < 2) {
      violations.push('cell_layout preview requires at least two cells');
    }
    let selectedCount = 0;
    for (const [index, box] of command.cellLayoutBoxes.entries()) {
      if (!Number.isFinite(box.x)) violations.push(`cell_layout[${index}].x must be finite`);
      if (!Number.isFinite(box.y)) violations.push(`cell_layout[${index}].y must be finite`);
      if (!Number.isFinite(box.z)) violations.push(`cell_layout[${index}].z must be finite`);
      if (!isFinitePositive(box.w)) violations.push(`cell_layout[${index}].w must be positive and finite`);
      if (!isFinitePositive(box.boxH))
        violations.push(`cell_layout[${index}].boxH must be positive and finite`);
      if (!isFinitePositive(box.d)) violations.push(`cell_layout[${index}].d must be positive and finite`);
      if (!Number.isInteger(box.doorCount) || box.doorCount < 1)
        violations.push(`cell_layout[${index}].doorCount must be a positive integer`);
      if (box.selected) selectedCount += 1;
    }
    if (selectedCount !== 1) violations.push('cell_layout preview requires exactly one selected cell');
  }
  return violations;
}
