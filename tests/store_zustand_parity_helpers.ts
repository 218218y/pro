import { createStore } from '../esm/native/platform/store.ts';

export type AnyRecord = Record<string, unknown>;

export function asRec(v: unknown): AnyRecord {
  return (v && typeof v === 'object' ? (v as AnyRecord) : {}) as AnyRecord;
}

export function dispatchCompat(store: any, env: AnyRecord, opts?: AnyRecord) {
  const type = env && (env as AnyRecord).type;
  if (type === 'PATCH') {
    return (store as AnyRecord).patch((env as AnyRecord).payload || {}, (env as AnyRecord).meta, opts);
  }
  if (type === 'SET') {
    const setRoot = (store as AnyRecord).setRoot;
    if (typeof setRoot !== 'function') {
      throw new Error('[test] Missing store.setRoot (required for SET parity tests)');
    }
    return setRoot.call(store, (env as AnyRecord).payload || {}, (env as AnyRecord).meta, opts);
  }
  throw new Error('[test] Unsupported store action type: ' + String(type));
}

export { createStore };
