import type { AppContainer } from '../../../../types/app.js';

import type { DoorsSetOpenOptionsLike } from '../../../../types/runtime.js';

export type ExportOrderPdfCaptureBase = {
  renderer: NonNullable<AppContainer['render']['renderer']>;
  scene: NonNullable<AppContainer['render']['scene']>;
  width: number;
  height: number;
  originalDoorOpen: boolean;
  doorsGetOpen: () => boolean;
  doorsSetOpen: (v: boolean, opts?: DoorsSetOpenOptionsLike) => unknown;
  view: NonNullable<AppContainer['view']>;
  originalSketchMode: boolean;
};
