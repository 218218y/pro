import type {
  ActionMetaLike,
  AppContainer,
  HingeMap,
  MetaActionsNamespaceLike,
  UiFeedbackNamespaceLike,
} from '../../../../../types';
import { setCfgHingeMap, setUiHingeDirection } from '../actions/store_actions.js';
import {
  applyImmediateStructuralConfigMutation,
  applyImmediateStructuralUiMutation,
} from '../actions/structural_build_refresh_actions.js';
import {
  enterStructureEditMode,
  exitStructureEditMode,
  structureTabReportNonFatal,
} from './structure_tab_shared.js';
import type { MutableRefLike } from './structure_tab_actions_controller_shared.js';

function createHingeAuthoringStructuralMetaOverrides(): ActionMetaLike {
  return {
    noHistory: true,
    noAutosave: true,
    noPersist: true,
    noCapture: true,
  };
}

function applyStructureHingeMapMutation(app: AppContainer, source: string, nextHingeMap: HingeMap): void {
  applyImmediateStructuralConfigMutation(
    app,
    source,
    { hingeMap: nextHingeMap },
    meta => {
      setCfgHingeMap(app, nextHingeMap, meta);
    },
    createHingeAuthoringStructuralMetaOverrides()
  );
}

function applyStructureHingeDirectionMutation(app: AppContainer, source: string, nextOn: boolean): void {
  applyImmediateStructuralUiMutation(
    app,
    source,
    { hingeDirection: !!nextOn },
    meta => {
      setUiHingeDirection(app, !!nextOn, meta);
    },
    createHingeAuthoringStructuralMetaOverrides()
  );
}

export function createStructureTabHingeActionsController(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
  fb: UiFeedbackNamespaceLike;
  hingeModeId: string;
  getHingeMap: () => HingeMap;
  getPrimaryMode: () => string;
  savedHingeMapRef: MutableRefLike<HingeMap | null>;
  hingeDispatchRef: MutableRefLike<boolean | null>;
}) {
  const enterHingeEditMode = (source: string) => {
    enterStructureEditMode({
      app: args.app,
      fb: args.fb,
      modeId: String(args.hingeModeId || 'hinge'),
      source,
      message: 'מצב עריכה: לחץ על דלת לשינוי כיוון',
    });
  };

  const exitHingeEditMode = (source: string) => {
    exitStructureEditMode({ app: args.app, modeId: String(args.hingeModeId || 'hinge'), source });
  };

  const setHingeDirection = (nextOn: boolean, reasonSource: string) => {
    const modeHinge = String(args.hingeModeId || 'hinge');

    try {
      applyStructureHingeDirectionMutation(args.app, reasonSource, !!nextOn);
    } catch (__wpErr) {
      structureTabReportNonFatal('L1936', __wpErr);
    }

    args.hingeDispatchRef.current = !!nextOn;

    if (nextOn) {
      try {
        const saved = args.savedHingeMapRef.current;
        const cur = args.getHingeMap();
        if (
          saved &&
          typeof saved === 'object' &&
          Object.keys(saved).length > 0 &&
          Object.keys(cur).length === 0
        ) {
          applyStructureHingeMapMutation(args.app, `${reasonSource}:restore`, { ...saved });
        }
      } catch (__wpErr) {
        structureTabReportNonFatal('L1959', __wpErr);
      }

      try {
        const cur = args.getHingeMap();
        const saved = args.savedHingeMapRef.current;
        const hasSaved = (saved && Object.keys(saved).length > 0) || Object.keys(cur).length > 0;

        if (!hasSaved) {
          enterHingeEditMode(reasonSource + ':autoEdit');
        }
      } catch (__wpErr) {
        structureTabReportNonFatal('L1974', __wpErr);
      }
      return;
    }

    try {
      if (args.getPrimaryMode() === modeHinge) exitHingeEditMode(reasonSource + ':exit');
    } catch (__wpErr) {
      structureTabReportNonFatal('L1981', __wpErr);
    }

    try {
      const cur = args.getHingeMap();
      args.savedHingeMapRef.current = Object.keys(cur).length ? { ...cur } : null;
    } catch {
      args.savedHingeMapRef.current = null;
    }
  };

  return {
    enterHingeEditMode,
    exitHingeEditMode,
    setHingeDirection,
  };
}
