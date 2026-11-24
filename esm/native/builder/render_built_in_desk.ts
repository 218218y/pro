import type { DrawerVisualEntryLike, Object3DLike } from '../../../types';
import type { BuiltInDeskBoard, BuiltInDeskHost } from '../../../types/built_in_desk.js';
import {
  BUILT_IN_DESK_DIMENSIONS,
  planBuiltInDesk,
  readBuiltInDeskPlacement,
} from '../../shared/built_in_desk.js';
import type { InteriorGroupLike } from './render_interior_ops_contracts.js';
import { resolveDrawerBoxVisual } from './render_drawer_ops_shared.js';
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

export type ResolvedBuiltInDesk = {
  host: BuiltInDeskHost;
  plan: NonNullable<ReturnType<typeof planBuiltInDesk>>;
};

export function resolveBuiltInDesk(host: BuiltInDeskHost | null, value: unknown): ResolvedBuiltInDesk | null {
  const placement = readBuiltInDeskPlacement(value);
  if (!host || !placement) return null;
  const plan = planBuiltInDesk(host.geometry, placement);
  return plan ? { host, plan } : null;
}

export type BuiltInDeskDoorOpening = {
  host: BuiltInDeskHost;
  yMin: number;
  yMax: number;
  keepShortLeaves?: boolean;
};

export function readBuiltInDeskDoorOpening(drawer: DrawerVisualEntryLike): BuiltInDeskDoorOpening | null {
  return readObject<BuiltInDeskDoorOpening>(drawer?.builtInDeskDoorOpening);
}

export function renderBuiltInDesk(args: {
  desk: ResolvedBuiltInDesk;
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
  drawerBoxMaterial: unknown;
  frontMaterial?: unknown;
  getPartMaterial?: (partId: string, fallback: unknown) => unknown;
  getPartColorValue?: ((partId: string) => unknown) | null;
  addDrawerGroup: (group: Object3DLike) => unknown;
  motion: DeskDrawers;
}): void {
  const {
    desk: { host, plan },
    createBoard,
    material,
    motion,
  } = args;
  const { thickness } = host.geometry;
  const prefix = `built_in_desk_${host.stack}_${host.moduleKey}_${host.boxId ?? 'cell'}`;
  function emit(board: BuiltInDeskBoard, partId: string, resolvedMaterial: unknown): unknown {
    return createBoard(
      board.width,
      board.height,
      board.depth,
      board.x,
      board.y,
      board.z,
      resolvedMaterial,
      partId
    );
  }
  function emitFront(board: BuiltInDeskBoard, partId: string, fallback = material): unknown {
    return emit(board, partId, args.getPartMaterial?.(partId, fallback) ?? fallback);
  }
  const fixedBoards = [
    emitFront(plan.top, `${prefix}_back`),
    emitFront(plan.bottom, `${prefix}_back`),
    emitFront(plan.back, `${prefix}_back`),
    ...(plan.support ? [emitFront(plan.support, `${prefix}_leg`)] : []),
    ...plan.drawerPartitions.map((board, index) => emitFront(board, `${prefix}_partition_${index + 1}`)),
  ];
  for (const board of fixedBoards) markBuiltInDeskHost(board, host, prefix);

  for (const [index, front] of plan.drawers.entries()) {
    const id = `${prefix}_front_${index + 1}`;
    const { drawerBoxPartId: boxId, drawerBoxMat } = resolveDrawerBoxVisual(
      id,
      args.drawerBoxMaterial,
      args.getPartColorValue ?? null,
      pid => args.getPartMaterial?.(pid, args.drawerBoxMaterial)
    );
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
      emitFront(front, id, args.frontMaterial ?? material),
      emit(
        {
          ...front,
          width: bodyDepth,
          height: bottomThickness,
          depth: boxSpanZ,
          x: centerX,
          y: bodyBottomY + bottomThickness / 2,
        },
        boxId,
        drawerBoxMat
      ),
      emit(
        { ...front, depth: boxSpanZ, height: sideHeight, x: bodyBackX + (plan.drawerSign * thickness) / 2 },
        boxId,
        drawerBoxMat
      ),
      emit(
        { ...front, depth: boxSpanZ, height: sideHeight, x: bodyFrontX - (plan.drawerSign * thickness) / 2 },
        boxId,
        drawerBoxMat
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
            width: bodyDepth - 2 * thickness,
            x: centerX,
          },
          boxId,
          drawerBoxMat
        )
      );
    }
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
      const opening: BuiltInDeskDoorOpening = {
        host,
        ...plan.doorOpening,
      };
      entry.builtInDeskDoorOpening = opening;
    }
    motion.entries.push(entry);
  }
}
