import type {
  RenderInteriorSketchBoxesArgs,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';
import { addFullShelfPinBoring } from './render_interior_shelf_pin_boring.js';

/** Geometry is published on the pickable box parts so pointer tools select the box, not its host cell. */
export type SketchBoxBoringBounds = {
  boxId: string;
  moduleKey: string;
  freePlacement: boolean;
  bottomY: number;
  topY: number;
  centerX: number;
  innerW: number;
  internalZ: number;
  internalDepth: number;
  regularDepth: number;
  woodThick: number;
};

type SceneNode = {
  userData?: Record<string, unknown>;
  children?: unknown[];
};

export function renderSketchBoxBoring(args: {
  renderArgs: RenderInteriorSketchBoxesArgs;
  shell: ResolvedSketchBoxState;
  startChildCount: number;
}): void {
  const { renderArgs, shell, startChildCount } = args;
  const geometry = shell.geometry;
  const bounds: SketchBoxBoringBounds = {
    boxId: shell.boxId,
    moduleKey: renderArgs.moduleKeyStr,
    freePlacement: shell.isFreePlacement,
    bottomY: shell.innerBottomY,
    topY: shell.innerTopY,
    centerX: geometry.centerX,
    innerW: geometry.innerW,
    internalZ: geometry.innerBackZ + geometry.innerD / 2,
    internalDepth: geometry.innerD,
    regularDepth: shell.regularDepth,
    woodThick: renderArgs.woodThick,
  };

  if (shell.box.fullShelfPinBoring === true) {
    addFullShelfPinBoring({
      enabled: true,
      threeSurface: renderArgs.THREE,
      group: renderArgs.group,
      roomArchitecturePlan: renderArgs.input.roomArchitecturePlan,
      moduleKey: `${renderArgs.moduleKeyStr}:${shell.boxId}`,
      bottomY: bounds.bottomY,
      topY: bounds.topY,
      leftInnerX: bounds.centerX - bounds.innerW / 2,
      rightInnerX: bounds.centerX + bounds.innerW / 2,
      internalZ: bounds.internalZ,
      internalDepth: bounds.internalDepth,
      regularDepth: bounds.regularDepth,
    });
  }

  const newObjects = (renderArgs.group as SceneNode).children?.slice(startChildCount) ?? [];
  const visit = (candidate: unknown): void => {
    if (!candidate || typeof candidate !== 'object') return;
    const node = candidate as SceneNode;
    const userData = node.userData;
    if (userData?.__wpSketchBoxId === shell.boxId) {
      userData.__wpFullBoringBox = bounds;
    }
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of newObjects) visit(node);
}
