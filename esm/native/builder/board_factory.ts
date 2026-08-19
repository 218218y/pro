// Board factory (Pure ESM)
//
// Goal: centralize board creation so Builder Core and pipelines can share a single,
// fail-fast wrapper around Render Ops.

import type {
  BuilderCreateBoardArgsLike,
  BuilderCreateBoardOptions,
  BuilderOutlineFn,
  ThreeLike,
  RoomArchitecturePlan,
  UnknownRecord,
} from '../../../types';

type CreateBoardFn = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: unknown,
  partId?: string | null,
  options?: BuilderCreateBoardOptions | null
) => unknown;

type AddOutlinesFn = BuilderOutlineFn;

export type BoardFactoryArgs = {
  THREE: ThreeLike | null;
  sketchMode: boolean;
  addOutlines: AddOutlinesFn | null;
  roomArchitecturePlan: RoomArchitecturePlan;
  runtime: BoardFactoryRuntime;
};

export type BoardFactoryRuntime = Readonly<{
  createBoard: (args: BuilderCreateBoardArgsLike) => unknown;
  reportError: ((error: unknown, context: UnknownRecord) => void) | null;
}>;

function attachBoardContext(error: unknown, context: UnknownRecord): void {
  if (!error || typeof error !== 'object' || Array.isArray(error)) return;
  (error as UnknownRecord).context = context;
}

/**
 * Creates a `createBoard(...)` function bound to the builder render context.
 *
 * @param {object} args
 * @param {unknown} args.App
 * @param {unknown} args.THREE
 * @param {boolean} args.sketchMode
 * @param {BuilderOutlineFn|null|undefined} args.addOutlines
 * @returns {(w:number,h:number,d:number,x:number,y:number,z:number,mat:unknown,partId?:string|null)=>unknown}
 */
export function makeBoardCreator(args: BoardFactoryArgs | null | undefined): CreateBoardFn {
  if (!args) throw new Error('[builder/board_factory] makeBoardCreator: args missing');

  const { THREE, sketchMode, addOutlines, roomArchitecturePlan, runtime } = args;
  if (!THREE) throw new Error('[builder/board_factory] makeBoardCreator: THREE missing');
  if (!runtime || typeof runtime.createBoard !== 'function') {
    throw new Error('[builder/board_factory] makeBoardCreator: runtime.createBoard missing');
  }

  return function createBoard(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: unknown,
    partId: string | null = null,
    options: BuilderCreateBoardOptions | null = null
  ) {
    try {
      const boardArgs: BuilderCreateBoardArgsLike = {
        THREE,
        w,
        h,
        d,
        x,
        y,
        z,
        mat,
        partId,
        sketchMode,
        addOutlines,
        roomArchitecturePlan,
      };
      if (options?.shape) boardArgs.shape = options.shape;
      if (options?.shelfExposedSide) boardArgs.shelfExposedSide = options.shelfExposedSide;
      if (options?.roundedShelfSide) boardArgs.roundedShelfSide = options.roundedShelfSide;
      if (typeof options?.roundedShelfRadius === 'number') {
        boardArgs.roundedShelfRadius = options.roundedShelfRadius;
      }
      if (typeof options?.roundedShelfSegments === 'number') {
        boardArgs.roundedShelfSegments = options.roundedShelfSegments;
      }

      const mesh = runtime.createBoard(boardArgs);

      if (!mesh) {
        throw new Error('[builder/board_factory] createBoard returned empty mesh');
      }
      return mesh;
    } catch (err: unknown) {
      const context: UnknownRecord = {
        source: 'builder/board_factory',
        op: 'createBoard',
        partId,
        dims: { w, h, d },
        pos: { x, y, z },
      };
      try {
        runtime.reportError?.(err, context);
      } catch {
        // Diagnostics cannot replace the board creation error.
      }
      attachBoardContext(err, context);
      throw err;
    }
  };
}
