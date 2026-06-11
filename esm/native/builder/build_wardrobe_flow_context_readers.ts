import {
  createMissingGetMaterial,
  readCalculateModuleStructure,
  readFunction,
} from './build_flow_readers.js';
import type { GetMaterialFn } from './build_flow_readers.js';

export type BuildWardrobeContextReaders = {
  calculateModuleStructureFn: ReturnType<typeof readCalculateModuleStructure>;
  getMaterialFn: GetMaterialFn;
  addOutlinesMesh: ((mesh: unknown) => unknown) | null;
};

export function resolveBuildWardrobeContextReaders(args: {
  label: string;
  sketchMode: boolean;
  calculateModuleStructure: unknown;
  getMaterial: unknown;
  addOutlines: unknown;
}): BuildWardrobeContextReaders {
  const { label, sketchMode, calculateModuleStructure, getMaterial, addOutlines } = args;

  const calculateModuleStructureFn = readCalculateModuleStructure(calculateModuleStructure);
  const getMaterialFn: GetMaterialFn =
    readFunction<GetMaterialFn>(getMaterial) || createMissingGetMaterial(label);

  const addOutlinesMesh =
    sketchMode && typeof addOutlines === 'function'
      ? readFunction<(mesh: unknown) => unknown>(addOutlines)
      : null;

  return {
    calculateModuleStructureFn,
    getMaterialFn,
    addOutlinesMesh,
  };
}
