import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  commitSketchModuleRod,
  commitSketchModuleShelf,
  commitSketchModuleStorageBarrier,
} from './canvas_picking_sketch_module_vertical_content.js';
import {
  createRandomId,
  parseSketchShelfTool,
  parseSketchStorageHeight,
  type CommitSketchModuleSurfaceToolArgs,
} from './canvas_picking_sketch_module_surface_commit_shared.js';

export function tryCommitSketchModuleVerticalContentTool(args: CommitSketchModuleSurfaceToolArgs): boolean {
  if (args.tool.startsWith('sketch_shelf:')) {
    const { variant, shelfDepthM } = parseSketchShelfTool(args.tool);
    commitSketchModuleShelf({
      cfg: args.cfg,
      bottomY: args.bottomY,
      totalHeight: args.totalHeight,
      pointerY: args.hitY0,
      yNorm: args.yNorm,
      variant,
      shelfDepthM,
      removeEps: SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM,
    });
    return true;
  }

  if (args.tool === 'sketch_rod') {
    commitSketchModuleRod({
      cfg: args.cfg,
      bottomY: args.bottomY,
      totalHeight: args.totalHeight,
      pointerY: args.hitY0,
      yNorm: args.yNorm,
      removeEps: SKETCH_BOX_DIMENSIONS.preview.removeEpsShelfM,
    });
    return true;
  }

  if (args.tool.startsWith('sketch_storage:')) {
    commitSketchModuleStorageBarrier({
      cfg: args.cfg,
      bottomY: args.bottomY,
      topY: args.topY,
      totalHeight: args.totalHeight,
      pad: args.pad,
      pointerY: args.hitYClamped,
      heightM: parseSketchStorageHeight(args.tool),
      removeEps: SKETCH_BOX_DIMENSIONS.preview.removeEpsBoxM,
      idFactory: () => createRandomId('ss'),
    });
    return true;
  }

  return false;
}
