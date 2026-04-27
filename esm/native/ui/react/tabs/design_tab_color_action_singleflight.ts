import type { AppContainer } from '../../../../../types';

import {
  runAppActionFamilySingleFlight,
  type AppActionFamilyFlight,
} from '../../action_family_singleflight.js';
import {
  buildDesignTabColorActionFailure,
  type DesignTabColorActionResult,
} from './design_tab_color_action_result.js';

export const DESIGN_TAB_COLOR_ACTION_SAVE_KEY = 'save-custom-color';

export type DesignTabColorActionFlightKey =
  | typeof DESIGN_TAB_COLOR_ACTION_SAVE_KEY
  | `upload-texture:${string}`
  | `delete-color:${string}`;

const designTabColorActionFlights = new WeakMap<
  object,
  AppActionFamilyFlight<DesignTabColorActionResult, DesignTabColorActionFlightKey>
>();

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildDesignTabColorTextureUploadFlightKey(fileKey: string): DesignTabColorActionFlightKey {
  return `upload-texture:${trim(fileKey)}`;
}

export function buildDesignTabColorDeleteFlightKey(id: string): DesignTabColorActionFlightKey {
  return `delete-color:${trim(id)}`;
}

export function readDesignTabColorActionKindFromKey(
  key: DesignTabColorActionFlightKey
): 'save-custom-color' | 'upload-texture' | 'delete-color' {
  if (key === DESIGN_TAB_COLOR_ACTION_SAVE_KEY) return 'save-custom-color';
  if (key.startsWith('upload-texture:')) return 'upload-texture';
  return 'delete-color';
}

export function runDesignTabColorActionSingleFlight(args: {
  app: AppContainer;
  key: DesignTabColorActionFlightKey;
  run: () => Promise<DesignTabColorActionResult>;
  onBusy?: ((result: DesignTabColorActionResult) => void) | null;
}): Promise<DesignTabColorActionResult> {
  const { app, key, run, onBusy } = args;
  return runAppActionFamilySingleFlight({
    flights: designTabColorActionFlights,
    app,
    key,
    run,
    onBusy: () => {
      const result = buildDesignTabColorActionFailure(readDesignTabColorActionKindFromKey(key), 'busy');
      if (typeof onBusy === 'function') onBusy(result);
      return result;
    },
  });
}
