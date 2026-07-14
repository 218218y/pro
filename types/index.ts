// WardrobePro - shared types entrypoint for gradual TypeScript adoption.
//
// This file is intentionally conservative and serves as a stable import target
// for `checkJs` JSDoc typedef imports: `import('../types').SomeType`.
//
// Keep this file as a *barrel only* to avoid circular type-only dependencies.

export * from './common';
export * from './async_operation';
export * from './kernel';
export * from './domain';
export * from './config_scalar';
export * from './runtime_scalar';
export * from './modules_configuration';
export * from './ui_raw';
export * from './ui_tabs';
export * from './ui_state';
export type {
  BrowserClearIntervalLike,
  BrowserClearTimeoutLike,
  BrowserDeps,
  BrowserSetIntervalLike,
  BrowserSetTimeoutLike,
  BrowserTimerCallback,
  Deps,
  Deps3D,
  IntervalHandleLike,
  PublicStoreLike,
  ReadableStoreLike,
  RootPublicStoreLike,
  StateKernelLike,
  StoreDebugStats,
  StoreSelectorSliceKey,
  StoreSourceDebugStat,
  TimeoutHandleLike,
} from './state';
export * from './ui';
export * from './three';
export * from './build';
export * from './app';
export type {
  ActionEnvelope,
  DispatchOptionsLike,
  PatchAction,
  PatchDispatchEnvelope,
  PublicPatchAction,
  PublicWardrobeProAction,
  SetAction,
  WardrobeProAction,
  WardrobeProActionType,
} from './actions';
export type { MetaSlicePatch, ModeSlicePatch, RuntimeSlicePatch, UiSlicePatch } from './patch_payload';
export * from './store_state';
export * from './runtime';
export * from './tools';
export * from './maps';
export * from './notes';

export * from './project';

export * from './models';

export * from './cloud_sync';
