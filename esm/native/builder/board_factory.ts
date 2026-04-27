// Board factory (Pure ESM)
//
// Goal: centralize board creation so Builder Core and pipelines can share a single,
// fail-fast wrapper around Render Ops.

import type {
  AppContainer,
  BuilderCreateBoardArgsLike,
  BuilderOutlineFn,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import { assertApp } from '../runtime/api.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { asRecord } from '../runtime/record.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

function isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

type CreateBoardFn = (
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: unknown,
  partId?: string | null
) => unknown;

type AddOutlinesFn = BuilderOutlineFn;

type BoardFactoryArgs = {
  App: AppContainer;
  THREE: ThreeLike | null;
  sketchMode: boolean;
  addOutlines: AddOutlinesFn | null;
};

function readAddOutlines(value: unknown): AddOutlinesFn | null {
  if (typeof value !== 'function') return null;
  const raw = value;
  return (...invokeArgs: unknown[]) => Reflect.apply(raw, undefined, invokeArgs);
}

function readThreeLike(value: unknown): ThreeLike | null {
  return asRecord<ThreeLike>(value);
}

function readBoardFactoryArgs(args: unknown): BoardFactoryArgs | null {
  if (!isRecord(args)) return null;
  try {
    return {
      App: assertApp(args.App, 'builder/board_factory.makeBoardCreator'),
      THREE: readThreeLike(args.THREE) || null,
      sketchMode: !!args.sketchMode,
      addOutlines: readAddOutlines(args.addOutlines),
    };
  } catch {
    return null;
  }
}

function attachBoardContext(error: unknown, context: UnknownRecord): void {
  if (!isRecord(error)) return;
  error.context = context;
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
export function makeBoardCreator(args: unknown): CreateBoardFn {
  const resolved = readBoardFactoryArgs(args);
  if (!resolved) throw new Error('[builder/board_factory] makeBoardCreator: args missing');

  const { App, THREE, sketchMode, addOutlines } = resolved;
  if (!THREE) throw new Error('[builder/board_factory] makeBoardCreator: THREE missing');

  const reportError = getPlatformReportError(App);

  return function createBoard(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: unknown,
    partId: string | null = null
  ) {
    const ro = getBuilderRenderOps(App);
    if (!ro || typeof ro.createBoard !== 'function') {
      throw new Error(
        '[builder/board_factory] builderRenderOps.createBoard missing (Pure ESM expects Render Ops installed)'
      );
    }

    try {
      const boardArgs: BuilderCreateBoardArgsLike = {
        App,
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
      };

      const mesh = ro.createBoard(boardArgs);

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
      if (reportError) {
        reportError(err, context);
      }
      attachBoardContext(err, context);
      throw err;
    }
  };
}
