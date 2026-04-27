import type { SavedColor } from '../esm/native/ui/react/tabs/design_tab_multicolor_panel.js';

export function createFeedbackSpy() {
  const seen: Array<{ message: string; type?: string }> = [];
  return {
    seen,
    toast(message: string, type?: string) {
      seen.push({ message, type });
    },
    prompt(_title: string, defaultValue: string, cb: (value: string | null) => void) {
      cb(defaultValue);
    },
    confirm(_title: string, _message: string, onYes: () => void) {
      onYes();
    },
  };
}

export function createAppHarness() {
  const state = {
    savedColors: [] as Array<Record<string, unknown>>,
    colorSwatchesOrder: [] as string[],
    customUploadedDataURL: '' as string | null,
    batchCalls: 0,
    patchCalls: [] as Array<Record<string, unknown>>,
    appliedChoice: '',
    appliedSource: '',
  };

  const app = {
    actions: {
      patch(patch: Record<string, unknown>, meta?: Record<string, unknown>) {
        state.patchCalls.push({ patch, meta: meta || {} });
        const cfg =
          patch && typeof patch.config === 'object' ? (patch.config as Record<string, unknown>) : null;
        const ui = patch && typeof patch.ui === 'object' ? (patch.ui as Record<string, unknown>) : null;
        if (cfg && Array.isArray(cfg.savedColors))
          state.savedColors = cfg.savedColors.slice() as Array<Record<string, unknown>>;
        if (cfg && Array.isArray(cfg.colorSwatchesOrder))
          state.colorSwatchesOrder = cfg.colorSwatchesOrder.slice() as string[];
        if (ui && typeof ui.colorChoice === 'string') {
          state.appliedChoice = ui.colorChoice;
          state.appliedSource = typeof meta?.source === 'string' ? meta.source : '';
        }
      },
      config: {
        setCustomUploadedDataURL(next: string | null) {
          state.customUploadedDataURL = next == null ? null : String(next);
        },
      },
      colors: {
        setSavedColors(next: Array<Record<string, unknown>>) {
          state.savedColors = Array.isArray(next) ? next.slice() : [];
        },
        setColorSwatchesOrder(next: string[]) {
          state.colorSwatchesOrder = Array.isArray(next) ? next.slice() : [];
        },
      },
      history: {
        batch(fn: () => void) {
          state.batchCalls += 1;
          fn();
        },
      },
    },
  } as const;

  const applyColorChoice = (choice: string, source?: string) => {
    state.appliedChoice = String(choice || '');
    state.appliedSource = String(source || '');
  };

  return { app: app as unknown, state, applyColorChoice };
}

export function createStateBag() {
  const bag = {
    customOpen: false,
    draftColor: '#d0d4d8',
    draftTextureName: '',
    draftTextureData: null as string | null,
  };
  return {
    bag,
    setCustomOpen(next: boolean) {
      bag.customOpen = next;
    },
    setDraftColor(next: string) {
      bag.draftColor = String(next);
    },
    setDraftTextureName(next: string) {
      bag.draftTextureName = String(next);
    },
    setDraftTextureData(next: string | null) {
      bag.draftTextureData = next == null ? null : String(next);
    },
  };
}

export const SAVED_COLORS: SavedColor[] = [
  { id: 'saved_a', name: 'לבן', type: 'color', value: '#ffffff', textureData: null },
];
