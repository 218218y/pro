import type { BuiltInDeskHost } from '../../../types/built_in_desk.js';
import type {
  RenderInteriorSketchBoxesArgs,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';
import { markBuiltInDeskHost, renderBuiltInDesk } from './render_built_in_desk.js';

export function applySketchBoxBuiltInDesks(
  args: RenderInteriorSketchBoxesArgs,
  shell: ResolvedSketchBoxState,
  startChildCount: number
): void {
  const lower = /^lower_(\d+)$/.exec(args.moduleKeyStr);
  const stack = lower || args.input.stackKey === 'bottom' ? 'bottom' : 'top';
  const moduleKey = lower ? Number(lower[1]) : args.moduleKeyStr;
  if (moduleKey === '') return;
  const { geometry } = shell;
  const host: BuiltInDeskHost = {
    moduleKey,
    stack,
    boxId: shell.boxId,
    boxIsStandalone: shell.isFreePlacement,
    geometry: {
      leftX: geometry.centerX - geometry.innerW / 2,
      rightX: geometry.centerX + geometry.innerW / 2,
      bottomY: shell.innerBottomY,
      topY: shell.innerTopY,
      backZ: geometry.innerBackZ,
      frontZ: shell.frontZ,
      thickness: args.shelfThick,
    },
  };

  for (const node of args.group.children?.slice(startChildCount) ?? []) {
    markBuiltInDeskHost(node, host);
  }

  const Group = args.THREE?.Group;
  if (!shell.box.builtInDesk || !Group || !args.drawersArray) return;
  renderBuiltInDesk({
    host,
    placement: shell.box.builtInDesk,
    createBoard: args.createBoard,
    material: shell.boxMat,
    ...(args.getPartMaterial ? { getPartMaterial: args.getPartMaterial } : {}),
    addDrawerGroup: group => args.group.add?.(group),
    motion: { createGroup: () => new Group(), entries: args.drawersArray },
  });
}
