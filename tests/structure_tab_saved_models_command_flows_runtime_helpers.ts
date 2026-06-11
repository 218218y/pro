export function createSavedModelByIdModelsApi(records: Record<string, any>, extra: Record<string, any> = {}) {
  return {
    getById(id: string) {
      return records[id] || null;
    },
    ...extra,
  } as any;
}

export function createPromptFeedback(promptValue: string | null, extra: Record<string, any> = {}) {
  return {
    prompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
      cb(promptValue);
    },
    confirm() {
      throw new Error('confirm should not run');
    },
    ...extra,
  } as any;
}

export function createConfirmFeedback(extra: Record<string, any> = {}) {
  return {
    prompt() {
      throw new Error('prompt should not run');
    },
    confirm(_title: string, _message: string, onYes: () => void, _onNo?: (() => void) | null) {
      onYes();
    },
    ...extra,
  } as any;
}
