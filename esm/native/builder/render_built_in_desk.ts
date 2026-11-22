import type { DrawerVisualEntryLike, Object3DLike } from '../../../types';
import type { BuiltInDeskBoard, BuiltInDeskHost } from '../../../types/built_in_desk.js';
import {
  BUILT_IN_DESK_DIMENSIONS,
  planBuiltInDesk,
  readBuiltInDeskPlacement,
} from '../../shared/built_in_desk.js';
import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import { readObject } from './render_interior_sketch_shared.js';

export function markBuiltInDeskHost(node: unknown, host: BuiltInDeskHost, deskId?: string): void {
  const object = readObject<InteriorGroupLike>(node);
  if (object) {
    object.userData = { ...object.userData, __wpBuiltInDeskHost: host };
    if (deskId) object.userData.__wpBuiltInDeskId = deskId;
  }
}

type DeskDrawers = {
  createGroup: () => Object3DLike;
  entries: unknown[];
};

export type BuiltInDeskDoorOpening = {
  host: BuiltInDeskHost;
  yMin: number;
  yMax: number;
};

export function readBuiltInDeskDoorOpening(drawer: DrawerVisualEntryLike): BuiltInDeskDoorOpening | null {
  return readObject<BuiltInDeskDoorOpening>(drawer?.builtInDeskDoorOpening);
}

export function renderBuiltInDesk(args: {
  host: BuiltInDeskHost;
  placement: unknown;
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
  const placement = readBuiltInDeskPlacement(args.placement);
  if (!placement) return;
  const { host, createBoard, material, motion } = args;
  const { thickness } = host.geometry;
  const plan = planBuiltInDesk(host.geometry, placement);
  if (!plan) return;
  const prefix = `built_in_desk_${host.stack}_${host.moduleKey}_${host.boxId ?? 'cell'}`;
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
    emit(plan.support, placement.support),
    ...plan.drawerPartitions.map((board, index) => emit(board, `partition_${index + 1}`)),
  ];
  for (const board of fixedBoards) markBuiltInDeskHost(board, host, prefix);

  for (const [index, front] of plan.drawers.entries()) {
    const key = `front_${index + 1}`;
    const drawerGroup = motion.createGroup();
    const { frontGapM } = BUILT_IN_DESK_DIMENSIONS;
    const runnerClearance = 0.013;
    const boxSpanZ = plan.bayWidth - 2 * (thickness + runnerClearance);
    const sideHeight = front.height - 2 * frontGapM;
    const bodyFrontX = front.x - (plan.drawerSign * thickness) / 2;
    const bodyBackX = plan.wallEdgeX + plan.drawerSign * thickness;
    const bodyDepth = Math.abs(bodyFrontX - bodyBackX);
    const centerX = (bodyFrontX + bodyBackX) / 2;
    const bodyBottomY = front.y - sideHeight / 2;
    const bottomThickness = 0.008;
    const boards = [
      emit(front, key),
      emit(
        {
          ...front,
          width: bodyDepth,
          height: bottomThickness,
          depth: boxSpanZ,
          x: centerX,
          y: bodyBottomY + bottomThickness / 2,
        },
        `${key}_base`
      ),
      emit(
        { ...front, depth: boxSpanZ, height: sideHeight, x: bodyBackX + (plan.drawerSign * thickness) / 2 },
        `${key}_back`
      ),
    ];
    for (const sign of [-1, 1]) {
      boards.push(
        emit(
          {
            ...front,
            z: front.z + (sign * (boxSpanZ - thickness)) / 2,
            depth: thickness,
            height: sideHeight,
            width: bodyDepth - thickness,
            x: centerX + (plan.drawerSign * thickness) / 2,
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
    const handleMount = motion.createGroup();
    handleMount.position.set(front.x, front.y, front.z);
    handleMount.rotation.y = (plan.drawerSign * Math.PI) / 2;
    handleMount.userData = {
      __wpDrawerOwnerPartId: id,
      __doorWidth: front.depth,
      __doorHeight: front.height,
      __frontMaxZ: front.width / 2,
      __wpFrontThickness: front.width,
    };
    drawerGroup.add(handleMount);
    markBuiltInDeskHost(drawerGroup, host, prefix);
    args.addDrawerGroup(drawerGroup);
    const entry: DrawerVisualEntryLike = {
      id,
      partId: id,
      builtInDeskId: prefix,
      group: drawerGroup,
      handleMount,
      closed: { x: 0, y: 0, z: 0 },
      open: { x: plan.drawerSign * bodyDepth * 0.8, y: 0, z: 0 },
      isInternal: false,
      isOpen: false,
    };
    if (index === 0) {
      const { doorClearanceM } = BUILT_IN_DESK_DIMENSIONS;
      const opening: BuiltInDeskDoorOpening = {
        host,
        yMin: plan.bottom.y - thickness / 2 - doorClearanceM,
        yMax: plan.surfaceY + doorClearanceM,
      };
      entry.builtInDeskDoorOpening = opening;
    }
    motion.entries.push(entry);
  }
}
