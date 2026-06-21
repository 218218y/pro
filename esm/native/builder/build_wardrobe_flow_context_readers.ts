import {
  createMissingGetMaterial,
  readCalculateModuleStructure,
  readFunction,
} from './build_flow_readers.js';
import type { GetMaterialFn } from './build_flow_readers.js';
import type { BuilderGetMaterialFactoryFn, ConfigStateLike, UnknownRecord } from '../../../types';
import { createMaterialSnapshotBinding } from './materials_factory_material_policy.js';

export type BuildWardrobeContextReaders = {
  calculateModuleStructureFn: ReturnType<typeof readCalculateModuleStructure>;
  getMaterialFn: GetMaterialFn;
  addOutlinesMesh: ((mesh: unknown) => unknown) | null;
};

export function resolveBuildWardrobeContextReaders(args: {
  label: string;
  sketchMode: boolean;
  cfgSnapshot: ConfigStateLike | UnknownRecord;
  calculateModuleStructure: unknown;
  getMaterial: unknown;
  addOutlines: unknown;
}): BuildWardrobeContextReaders {
  const { label, sketchMode, cfgSnapshot, calculateModuleStructure, getMaterial, addOutlines } = args;

  const calculateModuleStructureFn = readCalculateModuleStructure(calculateModuleStructure);
  const getMaterialFactory = readFunction<BuilderGetMaterialFactoryFn>(getMaterial);
  const getMaterialFn: GetMaterialFn = getMaterialFactory
    ? createMaterialSnapshotBinding(getMaterialFactory, { cfgSnapshot, sketchMode })
    : createMissingGetMaterial(label);

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
