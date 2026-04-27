import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

import {
  createObservabilityAliasMap,
  createObservabilityBuildDefines,
  resolveObservabilityBuildModeFromViteMode,
} from './tools/wp_observability_build.js';

export default defineConfig(({ mode }) => {
  const isModules = mode === 'modules';
  const observabilityBuildMode = resolveObservabilityBuildModeFromViteMode(mode);

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve('./esm'),
        ...createObservabilityAliasMap({
          root: path.resolve('.'),
          buildMode: observabilityBuildMode,
          useDist: false,
        }),
      },
    },

    define: {
      ...createObservabilityBuildDefines(observabilityBuildMode),
    },

    optimizeDeps: {
      entries: ['index_pro.html', 'index_pro_esm.html', 'index_site2.html'],
      include: ['pdfjs-dist/build/pdf.mjs', 'pdfjs-dist/build/pdf.worker.min.mjs'],
    },

    build: isModules
      ? {
          outDir: 'dist_vite',
          sourcemap: true,
          rolldownOptions: {
            input: {
              entry_pro: './esm/entry_pro.ts',
              entry_pro_main: './esm/entry_pro_main.ts',
              main: './esm/main.ts',
            },
            output: {
              preserveModules: true,
              preserveModulesRoot: '.',
              entryFileNames: '[name].js',
            },
          },
        }
      : {
          outDir: 'dist_vite',
          sourcemap: true,
          rolldownOptions: {
            input: {
              index_pro: './index_pro.html',
              index_pro_esm: './index_pro_esm.html',
              index_site2: './index_site2.html',
            },
          },
        },
  };
});
