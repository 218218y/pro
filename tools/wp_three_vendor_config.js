import { ESNEXT_BUILD_TARGET } from './wp_esnext_target_policy.mjs';

export function createThreeVendorBuildConfig({
  root,
  entryAbs,
  tmpDirAbs,
  sourcemap = false,
  minify = true,
}) {
  return {
    root,
    logLevel: 'error',
    configFile: false,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      emptyOutDir: true,
      outDir: tmpDirAbs,
      sourcemap,
      minify: minify ? 'oxc' : false,
      cssMinify: minify ? 'lightningcss' : false,
      copyPublicDir: false,
      reportCompressedSize: false,
      target: ESNEXT_BUILD_TARGET,
      lib: {
        entry: entryAbs,
        formats: ['es'],
        name: 'ThreeVendor',
        fileName: 'three.vendor',
      },
      rolldownOptions: {
        treeshake: {
          // Be more aggressive. Three.js source modules are mostly side-effect free.
          // This helps a lot when we import from `three/src/**`.
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
        output: {
          codeSplitting: false,
        },
      },
    },
  };
}
