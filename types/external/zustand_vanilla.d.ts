declare module 'zustand/vanilla' {
  export interface StoreApi<T> {
    getState: () => T;
    setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
    getInitialState?: () => T;
  }

  export function createStore<T>(
    initializer: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T
  ): StoreApi<T>;
}
