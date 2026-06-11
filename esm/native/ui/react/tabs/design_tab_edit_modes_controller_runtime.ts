import type { AppContainer, UnknownRecord } from '../../../../../types';

import { enterPrimaryMode, exitPrimaryMode } from '../actions/modes_actions.js';
import { setUiFlag } from '../actions/store_actions.js';
import { __designTabReportNonFatal } from './design_tab_multicolor_shared.js';
import type {
  DesignTabFeatureToggleKey,
  DesignTabFeedbackApi,
  EnterModeOptsLike,
} from './design_tab_shared.js';

export type DesignTabEditModesState = {
  grooveActive: boolean;
  splitActive: boolean;
  splitIsCustom: boolean;
  removeDoorActive: boolean;
};

export type ReadDesignTabEditModesStateArgs = {
  primaryMode: string;
  splitVariant: string;
  grooveModeId: string;
  splitModeId: string;
  removeDoorModeId: string;
};

export type DesignTabEditModesControllerArgs = {
  app: AppContainer;
  feedback: DesignTabFeedbackApi;
  grooveModeId: string;
  splitModeId: string;
  removeDoorModeId: string;
  groovesEnabled: boolean;
  splitDoors: boolean;
  removeDoorsEnabled: boolean;
  groovesDirty: boolean;
  removedDoorsDirty: boolean;
  grooveActive: boolean;
  splitActive: boolean;
  splitIsCustom: boolean;
  removeDoorActive: boolean;
  reportNonFatal?: (op: string, err: unknown, throttleMs?: number) => void;
};

export type DesignTabEditModesController = {
  setFeatureToggle: (key: DesignTabFeatureToggleKey, on: boolean) => void;
  toggleGrooveEdit: () => void;
  toggleSplitEdit: () => void;
  toggleSplitCustomEdit: () => void;
  toggleRemoveDoorEdit: () => void;
};

function readModeKey(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function readDesignTabEditModesState(args: ReadDesignTabEditModesStateArgs): DesignTabEditModesState {
  const primaryKey = readModeKey(args.primaryMode || 'none');
  const grooveKey = readModeKey(args.grooveModeId);
  const splitKey = readModeKey(args.splitModeId);
  const removeDoorKey = readModeKey(args.removeDoorModeId);
  const grooveActive = primaryKey === grooveKey;
  const splitActive = primaryKey === splitKey;
  const removeDoorActive = primaryKey === removeDoorKey;
  const splitIsCustom = splitActive && readModeKey(args.splitVariant) === 'custom';
  return { grooveActive, splitActive, splitIsCustom, removeDoorActive };
}

export function createDesignTabEditModesController(
  args: DesignTabEditModesControllerArgs
): DesignTabEditModesController {
  const reportNonFatal = args.reportNonFatal || __designTabReportNonFatal;
  const feedback = args.feedback;
  let activeFeatureToggleTransaction: {
    uiPatch: UnknownRecord;
    source: string;
    consumed: boolean;
  } | null = null;

  const showModeWarn = (op: string, err: unknown) => {
    try {
      feedback.toast('לא ניתן להפעיל מצב עריכה (UI modes לא נטענו)', 'warn');
    } catch (toastErr) {
      reportNonFatal(`${op}:toastWarn`, toastErr);
    }
    try {
      console.warn('[ReactUI] design edit mode failed', err);
    } catch (warnErr) {
      reportNonFatal(`${op}:enterWarn`, warnErr);
    }
  };

  const withFeatureToggleTransaction = (
    opts: EnterModeOptsLike,
    uiPatch: UnknownRecord | null,
    source: string
  ): EnterModeOptsLike => {
    if (!uiPatch) return opts;
    return {
      ...opts,
      source,
      immediate: true,
      uiPatch,
    };
  };

  const consumeFeatureToggleTransaction = () => {
    const tx = activeFeatureToggleTransaction;
    if (tx) tx.consumed = true;
    return tx;
  };

  const enterEditMode = (
    modeId: string,
    toast: string,
    uiPatch: UnknownRecord | null = null,
    source = ''
  ) => {
    const tx = uiPatch ? null : consumeFeatureToggleTransaction();
    try {
      enterPrimaryMode(
        args.app,
        String(modeId),
        withFeatureToggleTransaction(
          {
            closeDoors: true,
            cursor: 'alias',
            toast: String(toast || ''),
          },
          uiPatch || tx?.uiPatch || null,
          source || tx?.source || ''
        )
      );
    } catch (err) {
      showModeWarn('editModes', err);
    }
  };

  const enterSplitEditMode = (
    toast: string,
    variant: '' | 'custom',
    uiPatch: UnknownRecord | null = null,
    source = ''
  ) => {
    const tx = uiPatch ? null : consumeFeatureToggleTransaction();
    try {
      enterPrimaryMode(
        args.app,
        String(args.splitModeId),
        withFeatureToggleTransaction(
          {
            closeDoors: true,
            cursor: 'alias',
            toast: String(toast || ''),
            modeOpts: variant ? { splitVariant: variant } : undefined,
          },
          uiPatch || tx?.uiPatch || null,
          source || tx?.source || ''
        )
      );
    } catch (err) {
      showModeWarn('editModes:split', err);
    }
  };

  const exitEditMode = (expectedMode: string, uiPatch: UnknownRecord | null = null, source = '') => {
    try {
      const tx = uiPatch ? null : consumeFeatureToggleTransaction();
      const patch = uiPatch || tx?.uiPatch || null;
      if (patch) {
        exitPrimaryMode(args.app, String(expectedMode), {
          source: source || tx?.source || '',
          immediate: true,
          uiPatch: patch,
        });
        return;
      }
      exitPrimaryMode(args.app, String(expectedMode));
    } catch (err) {
      try {
        console.warn('[ReactUI] exitEditMode failed', err);
      } catch (warnErr) {
        reportNonFatal('editModes:exitWarn', warnErr);
      }
    }
  };

  const readCurrentFeatureToggle = (key: DesignTabFeatureToggleKey): boolean | null => {
    if (key === 'groovesEnabled') return !!args.groovesEnabled;
    if (key === 'splitDoors') return !!args.splitDoors;
    if (key === 'removeDoorsEnabled') return !!args.removeDoorsEnabled;
    return null;
  };

  const setFeatureToggle = (key: DesignTabFeatureToggleKey, on: boolean) => {
    const nextOn = !!on;
    const current = readCurrentFeatureToggle(key);
    if (current != null && current === nextOn) return;

    const source = `react:design:${key}`;
    const uiPatch = { [key]: nextOn };
    activeFeatureToggleTransaction = { uiPatch, source, consumed: false };

    if (nextOn) {
      try {
        if (key === 'groovesEnabled' && !args.groovesEnabled && !args.grooveActive && !args.groovesDirty) {
          enterEditMode(args.grooveModeId, 'חריטה - לחץ על דלת לסימון/ביטול');
        }
        if (
          key === 'removeDoorsEnabled' &&
          !args.removeDoorsEnabled &&
          !args.removeDoorActive &&
          !args.removedDoorsDirty
        ) {
          enterEditMode(args.removeDoorModeId, 'הסרת דלת - לחץ להסרה/החזרה');
        }
      } catch (err) {
        reportNonFatal('editModes:featureToggle:on', err);
      }
      if (!activeFeatureToggleTransaction?.consumed) {
        setUiFlag(args.app, key, nextOn, { source, immediate: true });
      }
      activeFeatureToggleTransaction = null;
      return;
    }

    try {
      if (key === 'groovesEnabled' && args.grooveActive) exitEditMode(args.grooveModeId);
      if (key === 'splitDoors' && args.splitActive) exitEditMode(args.splitModeId);
      if (key === 'removeDoorsEnabled' && args.removeDoorActive) {
        exitEditMode(args.removeDoorModeId);
      }
    } catch (err) {
      reportNonFatal('editModes:featureToggle:off', err);
    }
    if (!activeFeatureToggleTransaction?.consumed) {
      setUiFlag(args.app, key, nextOn, { source, immediate: true });
    }
    activeFeatureToggleTransaction = null;
  };

  return {
    setFeatureToggle,
    toggleGrooveEdit: () => {
      if (args.grooveActive) exitEditMode(args.grooveModeId);
      else enterEditMode(args.grooveModeId, 'חריטה - לחץ על דלת לסימון/ביטול');
    },
    toggleSplitEdit: () => {
      if (args.splitActive && !args.splitIsCustom) exitEditMode(args.splitModeId);
      else enterSplitEditMode('חיתוך דלתות - לחץ על דלת לעריכה', '');
    },
    toggleSplitCustomEdit: () => {
      if (args.splitIsCustom) exitEditMode(args.splitModeId);
      else enterSplitEditMode('חיתוך דלתות ידני - הזז עכבר, לחץ להוספה/הסרה', 'custom');
    },
    toggleRemoveDoorEdit: () => {
      if (args.removeDoorActive) exitEditMode(args.removeDoorModeId);
      else enterEditMode(args.removeDoorModeId, 'הסרת דלת - לחץ להסרה/החזרה');
    },
  };
}
