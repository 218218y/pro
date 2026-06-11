// Builder install surface (Pure ESM)
//
// This is the *public* Builder entry point for cross-layer boot code.
// Keep it SMALL and stable.
//
// Canonical surfaces:
// - Builder service provider: App.services.builder (provideBuilder)
// - Builder room design installer: App.services.roomDesign (installRoomDesign)
// - Builder core orchestrator: App.services.builder.buildWardrobe (installBuilderCore)

export { provideBuilder, isBuilderProvided } from './provide.js';
export { installBuilderCore, getBuilder } from './core.js';
export { installRoomDesign } from './room.js';
