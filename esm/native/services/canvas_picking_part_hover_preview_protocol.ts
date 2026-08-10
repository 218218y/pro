export type PartHoverPreviewOp = 'add' | 'remove';
export type PartHoverPreviewKind = 'box' | 'object_boxes';
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

export type PartHoverPreviewCommand = PartHoverBoxPreviewCommand | PartHoverObjectBoxesPreviewCommand;

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
  return violations;
}
