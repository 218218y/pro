import type {
  ActionMetaLike,
  AppContainer,
  MetaActionsNamespaceLike,
  HingeMap,
  UiFeedbackNamespaceLike,
} from '../../../../../types';
import { setCfgHingeMap, setUiHingeDirection } from '../actions/store_actions.js';
import { applyImmediateStructuralConfigMutation } from '../actions/structural_build_refresh_actions.js';
import {
  enterStructureEditMode,
  exitStructureEditMode,
  structureTabReportNonFatal,
} from './structure_tab_shared.js';
import type { MutableRefLike } from './structure_tab_actions_controller_shared.js';
import { createStructureTabNoBuildNoHistoryImmediateMeta } from './structure_tab_meta.js';

function createHingeMapStructuralMetaOverrides(): ActionMetaLike {
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
    createHingeMapStructuralMetaOverrides()
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
      setUiHingeDirection(
        args.app,
        !!nextOn,
        createStructureTabNoBuildNoHistoryImmediateMeta(args.meta, reasonSource)
      );
    } catch (__wpErr) {
      structureTabReportNonFatal('L1936', __wpErr);
    }

    args.hingeDispatchRef.current = !!nextOn;

    if (nextOn) {
      try {
        const saved = args.savedHingeMapRef.current;
        if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
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

    try {
      applyStructureHingeMapMutation(args.app, `${reasonSource}:clear`, {});
    } catch (__wpErr) {
      structureTabReportNonFatal('L2004', __wpErr);
    }
  };

  return {
    enterHingeEditMode,
    exitHingeEditMode,
    setHingeDirection,
  };
}
