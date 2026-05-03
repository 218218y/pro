import type { MutableRefObject } from 'react';

export type ObservedDrawingRectPublishMode = 'size' | 'full';

export type ObservedViewportValueArgs<T> = {
  enabled: boolean;
  anchor: Node | null;
  initialValue: T;
  observeScroll?: boolean;
  resizeTargets?: ReadonlyArray<Element | null | undefined>;
  measure: () => T;
  areEqual: (prev: T, next: T) => boolean;
};

export type ObservedViewportValueResult<T> = {
  value: T;
  valueRef: MutableRefObject<T>;
  refreshNow: () => T;
};
