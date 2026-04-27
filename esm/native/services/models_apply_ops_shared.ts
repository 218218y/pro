import type { AppContainer } from '../../../types';

import {
  _notify,
  _persistPresetOrder,
  _persistUserOnly,
  ensureModelsLoadedInternal,
  syncModelsStateToApp,
} from './models_registry.js';

export function ensureModelsCommandState(App: AppContainer): void {
  ensureModelsLoadedInternal(App, { silent: true });
}

export function commitUserModelsMutation(App: AppContainer): void {
  _persistUserOnly(App);
  syncModelsStateToApp(App);
  _notify(App);
}

export function commitPresetOrderMutation(App: AppContainer): void {
  _persistPresetOrder(App);
  syncModelsStateToApp(App);
  _notify(App);
}
