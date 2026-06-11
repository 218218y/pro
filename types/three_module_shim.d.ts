// Shim for the local vendored Three.js ESM bundle.
// In the boot typecheck configuration we only include a subset of files,
// so TypeScript's bundler resolver may fail to locate this .js module.
// Declaring it here keeps typecheck green without changing runtime behavior.

declare module '../libs/three/build/three.module.js';
