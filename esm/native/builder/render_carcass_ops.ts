import { createApplyCarcassBaseOps } from './render_carcass_ops_base.js';
import { createApplyCarcassCorniceOps } from './render_carcass_ops_cornice.js';
import {
  __asContext,
  __asOps,
  __outlineFn,
  __partMaterialFn,
  __readGroupLike,
  __readThreeCtorLike,
  type RenderCarcassOpsDeps,
  type RenderCarcassRuntime,
} from './render_carcass_ops_shared.js';

export function createBuilderRenderCarcassOps(deps: RenderCarcassOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __three = deps.three;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;

  const { applyCarcassBaseOps } = createApplyCarcassBaseOps({
    isBackPanelSeg: deps.isBackPanelSeg,
  });
  const { applyCarcassCorniceOps } = createApplyCarcassCorniceOps();

  function applyCarcassOps(opsIn: unknown, ctxIn: unknown) {
    let App = __app(ctxIn);
    __ops(App);
    try {
      const ops = __asOps(opsIn);
      if (!ops) return false;

      const runtime = resolveCarcassRuntime({
        App,
        ctxIn,
        deps,
        __app,
        __wardrobeGroup,
        __three,
        __renderOpsHandleCatch,
      });
      if (!runtime) return false;

      applyCarcassBaseOps(ops, runtime);
      applyCarcassCorniceOps(ops.cornice, runtime);
      return true;
    } catch (e) {
      __renderOpsHandleCatch(App, 'applyCarcassOps', e, {
        hasOps: !!opsIn,
      });
      return false;
    }
  }

  return {
    applyCarcassOps,
  };
}

type ResolveCarcassRuntimeArgs = {
  App: ReturnType<RenderCarcassOpsDeps['app']>;
  ctxIn: unknown;
  deps: RenderCarcassOpsDeps;
  __app: RenderCarcassOpsDeps['app'];
  __wardrobeGroup: RenderCarcassOpsDeps['wardrobeGroup'];
  __three: RenderCarcassOpsDeps['three'];
  __renderOpsHandleCatch: RenderCarcassOpsDeps['renderOpsHandleCatch'];
};

function resolveCarcassRuntime(args: ResolveCarcassRuntimeArgs): RenderCarcassRuntime | null {
  const ctx = __asContext(args.ctxIn);
  const THREE = __readThreeCtorLike(args.__three(ctx.THREE));
  const App = ctx.App || args.App;
  const wardrobeGroup = App ? __readGroupLike(args.__wardrobeGroup(App)) : null;
  if (!THREE || !App || !wardrobeGroup) return null;

  return {
    App,
    THREE,
    wardrobeGroup,
    ctx,
    addOutlines: __outlineFn(ctx.addOutlines),
    getPartMaterial: __partMaterialFn(ctx.getPartMaterial),
    sketchMode: !!ctx.__sketchMode,
    reg: args.deps.reg,
    renderOpsHandleCatch: args.__renderOpsHandleCatch,
  };
}
