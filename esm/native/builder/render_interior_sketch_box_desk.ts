import type { BuiltInDeskHost } from '../../../types/built_in_desk.js';
import type {
  RenderInteriorSketchBoxesArgs,
  ResolvedSketchBoxState,
} from './render_interior_sketch_boxes_shared.js';
import {
  markBuiltInDeskHost,
  renderBuiltInDesk,
  resolveBuiltInDesk,
  type ResolvedBuiltInDesk,
} from './render_built_in_desk.js';

export function resolveSketchBoxDesk(
  args: RenderInteriorSketchBoxesArgs,
  shell: ResolvedSketchBoxState
): { host: BuiltInDeskHost | null; desk: ResolvedBuiltInDesk | null } {
  const lower = /^lower_(\d+)$/.exec(args.moduleKeyStr);
  const stack = lower || args.input.stackKey === 'bottom' ? 'bottom' : 'top';
  const moduleKey = lower ? Number(lower[1]) : args.moduleKeyStr;
  if (moduleKey === '') return { host: null, desk: null };
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
  const desk = args.THREE?.Group ? resolveBuiltInDesk(host, shell.box.builtInDesk) : null;
  return { host, desk };
}

export function applySketchBoxBuiltInDesks(
  args: RenderInteriorSketchBoxesArgs,
  shell: ResolvedSketchBoxState,
  startChildCount: number,
  host: BuiltInDeskHost | null,
  desk: ResolvedBuiltInDesk | null
): void {
  if (!host) return;
  for (const node of args.group.children?.slice(startChildCount) ?? []) {
    markBuiltInDeskHost(node, host);
  }

  const Group = args.THREE?.Group;
  if (!desk || !Group) return;
  renderBuiltInDesk({
    desk,
    createBoard: args.createBoard,
    material: shell.boxMat,
    drawerBoxMaterial: args.whiteMat,
    getPartColorValue: args.getPartColorValue ?? null,
    ...(args.getPartMaterial ? { getPartMaterial: args.getPartMaterial } : {}),
    addDrawerGroup: group => args.group.add?.(group),
    motion: { createGroup: () => new Group(), entries: args.drawersArray },
  });
}
