// Pure ESM App container (TypeScript implementation).
//
// Goals:
// - No window/global-scope usage.
// - No install-on-import side effects.
// - Explicit dependency injection surface (app.deps).
//
// Stage 2 note:
// We removed the module-local "active app" singleton. Consumers must now
// receive an app instance explicitly (DI), typically from esm/main.ts (source) / dist/esm/main.js (built) createApp()/boot().

import type { AppContainer, Namespace, RenderNamespaceLike } from '../types';

function ns(): Namespace {
  const target: Namespace = {};
  Object.setPrototypeOf(target, null);
  return target;
}

function nsRender(): Namespace & RenderNamespaceLike {
  const render: Namespace & RenderNamespaceLike = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    wardrobeGroup: null,
    roomGroup: null,
    doorsArray: [],
    drawersArray: [],
    moduleHitBoxes: [],
    _partObjects: [],
  };
  Object.setPrototypeOf(render, null);
  return render;
}

export function createAppContainer(): AppContainer {
  return {
    // Explicit dependency injection surface (populated by boot({ deps })).
    deps: ns(),

    // Optional feature flags (injected via deps.flags at boot; read-only conventions).
    flags: ns(),

    // Common namespaces (installed by native modules).
    config: ns(),
    platform: ns(),
    render: nsRender(),
    ui: ns(),
    layers: ns(),
    services: ns(),

    // Core state surfaces.
    state: ns(),
    stores: ns(),
    registries: ns(),

    // Builder-related shared namespace.
    builder: ns(),
    builderDeps: ns(),

    // Builder outputs.
    builderModules: ns(),
    builderContents: ns(),

    // Optional disposal hooks registered during boot.
    disposables: [],
  };
}
