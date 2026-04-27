// WardrobePro - shared types entrypoint for gradual TypeScript adoption.
//
// This file is intentionally conservative and serves as a stable import target
// for `checkJs` JSDoc typedef imports: `import('../types').SomeType`.
//
// Keep this file as a *barrel only* to avoid circular type-only dependencies.
export * from './common';
export * from './kernel';
export * from './domain';
export * from './config_scalar';
export * from './runtime_scalar';
export * from './modules_configuration';
export * from './ui_raw';
export * from './ui_tabs';
export * from './ui_state';
export * from './state';
export * from './ui';
export * from './three';
export * from './build';
export * from './app';
export * from './actions';
export * from './patch_payload';
export * from './store_state';
export * from './store_spine';
export * from './runtime';
export * from './tools';
export * from './maps';
export * from './notes';
export * from './project';
export * from './models';
export * from './cloud_sync';
