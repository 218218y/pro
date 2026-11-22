import type { DrawerVisualEntryLike, Object3DLike } from '../../../types';
import type { BuiltInDeskBoard, BuiltInDeskHost, BuiltInDeskSide } from '../../../types/built_in_desk.js';
import {
  BUILT_IN_DESK_DIMENSIONS,
  planBuiltInDesk,
  readBuiltInDeskPlacement,
} from '../../shared/built_in_desk.js';
import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import { readObject } from './render_interior_sketch_shared.js';

export function markBuiltInDeskHost(node: unknown, host: BuiltInDeskHost, side?: BuiltInDeskSide): void {
  const object = readObject<InteriorGroupLike>(node);
  if (object) {
    object.userData = { ...object.userData, __wpBuiltInDeskHost: host };
    if (side) object.userData.__wpBuiltInDeskSide = side;
  }
}

type DeskDrawers = {
  createGroup: () => Object3DLike;
  entries: unknown[];
};

export function renderBuiltInDesks(args: {
  host: BuiltInDeskHost;
  placements: unknown;
  createBoard: (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: unknown,
    partId: string
  ) => unknown;
  material: unknown;
  getPartMaterial?: (partId: string, fallback: unknown) => unknown;
  addDrawerGroup: (group: Object3DLike) => unknown;
  motion: DeskDrawers;
}): void {
  const placements = readObject<Record<string, unknown>>(args.placements);
  if (!placements) return;
  const { host, createBoard, material, motion } = args;
  const { thickness, backZ } = host.geometry;
  for (const side of ['left', 'right'] as const) {
    const placement = readBuiltInDeskPlacement(placements[side]);
    if (!placement) continue;
    const plan = planBuiltInDesk(host.geometry, side, placement);
    if (!plan) continue;
    const prefix = `built_in_desk_${host.stack}_${host.moduleKey}_${host.boxId ?? 'cell'}_${side}`;
    function emit(board: BuiltInDeskBoard, suffix: string): unknown {
      const partId = `${prefix}_${suffix}`;
      return createBoard(
        board.width,
        board.height,
        board.depth,
        board.x,
        board.y,
        board.z,
        args.getPartMaterial?.(partId, material) ?? material,
        partId
      );
    }
    const fixedBoards = [
      emit(plan.top, 'top'),
      emit(plan.bottom, 'bottom'),
      ...plan.drawerPartitions.map((board, index) => emit(board, `partition_${index + 1}`)),
    ];
    if (plan.support) fixedBoards.push(emit(plan.support, placement.support));
    for (const board of fixedBoards) markBuiltInDeskHost(board, host, side);

    for (const [index, front] of plan.drawers.entries()) {
      const key = `front_${index + 1}`;
      const drawerGroup = motion.createGroup();
      const { frontGapM } = BUILT_IN_DESK_DIMENSIONS;
      const runnerClearance = 0.013;
      const boxWidth = plan.bayWidth - 2 * (thickness + runnerClearance);
      const sideHeight = front.height - 2 * frontGapM;
      const bodyFrontZ = front.z - thickness / 2;
      const bodyBackZ = backZ + thickness;
      const bodyDepth = bodyFrontZ - bodyBackZ;
      const centerZ = (bodyFrontZ + bodyBackZ) / 2;
      const bodyBottomY = front.y - sideHeight / 2;
      const bottomThickness = 0.008;
      const boards = [
        emit(front, key),
        emit(
          {
            ...front,
            width: boxWidth,
            height: bottomThickness,
            depth: bodyDepth,
            z: centerZ,
            y: bodyBottomY + bottomThickness / 2,
          },
          `${key}_base`
        ),
        emit({ ...front, width: boxWidth, height: sideHeight, z: bodyBackZ + thickness / 2 }, `${key}_back`),
      ];
      for (const sign of [-1, 1]) {
        boards.push(
          emit(
            {
              ...front,
              x: front.x + (sign * (boxWidth - thickness)) / 2,
              width: thickness,
              height: sideHeight,
              depth: bodyDepth - thickness,
              z: centerZ + thickness / 2,
            },
            `${key}_${sign < 0 ? 'left' : 'right'}`
          )
        );
      }
      const id = `${prefix}_${key}`;
      for (const board of boards) {
        const node = readObject<Object3DLike>(board);
        if (!node) continue;
        node.userData = { ...node.userData, drawerId: id };
        drawerGroup.add(node);
      }
      markBuiltInDeskHost(drawerGroup, host, side);
      args.addDrawerGroup(drawerGroup);
      const entry: DrawerVisualEntryLike = {
        id,
        partId: id,
        group: drawerGroup,
        closed: { x: 0, y: 0, z: 0 },
        open: { x: 0, y: 0, z: bodyDepth * 0.8 },
        isInternal: false,
      };
      motion.entries.push(entry);
    }
  }
}
