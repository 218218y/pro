import type { ProjectDataLike, ProjectSchemaValidationResult } from '../../../types/index.js';

export function validateProjectData(data: ProjectDataLike): ProjectSchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') errors.push('Project root is not an object');
  if (!data.settings || typeof data.settings !== 'object') errors.push('Missing "settings" object');

  if (data.modulesConfiguration && !Array.isArray(data.modulesConfiguration))
    warnings.push('"modulesConfiguration" is not an array (coerced)');
  if (data.stackSplitLowerModulesConfiguration && !Array.isArray(data.stackSplitLowerModulesConfiguration))
    warnings.push('"stackSplitLowerModulesConfiguration" is not an array (coerced)');
  if (data.splitDoorsMap && typeof data.splitDoorsMap !== 'object')
    warnings.push('"splitDoorsMap" is not an object (coerced)');
  if (data.splitDoorsBottomMap && typeof data.splitDoorsBottomMap !== 'object')
    warnings.push('"splitDoorsBottomMap" is not an object (coerced)');
  if (data.handlesMap && typeof data.handlesMap !== 'object')
    warnings.push('"handlesMap" is not an object (coerced)');
  if (data.hingeMap && typeof data.hingeMap !== 'object')
    warnings.push('"hingeMap" is not an object (coerced)');
  if (data.removedDoorsMap && typeof data.removedDoorsMap !== 'object')
    warnings.push('"removedDoorsMap" is not an object (coerced)');
  if (data.curtainMap && typeof data.curtainMap !== 'object')
    warnings.push('"curtainMap" is not an object (coerced)');
  if (data.doorSpecialMap && typeof data.doorSpecialMap !== 'object')
    warnings.push('"doorSpecialMap" is not an object (coerced)');
  if (data.individualColors && typeof data.individualColors !== 'object')
    warnings.push('"individualColors" is not an object (coerced)');
  if (data.doorStyleMap && typeof data.doorStyleMap !== 'object')
    warnings.push('"doorStyleMap" is not an object (coerced)');
  if (data.mirrorLayoutMap && typeof data.mirrorLayoutMap !== 'object')
    warnings.push('"mirrorLayoutMap" is not an object (coerced)');
  if (data.doorTrimMap && typeof data.doorTrimMap !== 'object')
    warnings.push('"doorTrimMap" is not an object (coerced)');
  if (data.groovesMap && typeof data.groovesMap !== 'object')
    warnings.push('"groovesMap" is not an object (coerced)');
  if (data.grooveLinesCountMap && typeof data.grooveLinesCountMap !== 'object')
    warnings.push('"grooveLinesCountMap" is not an object (coerced)');
  if (
    data.grooveLinesCount !== undefined &&
    data.grooveLinesCount !== null &&
    (!Number.isFinite(Number(data.grooveLinesCount)) || Number(data.grooveLinesCount) < 1)
  ) {
    warnings.push('"grooveLinesCount" is not a positive number (coerced)');
  }
  if (data.toggles && typeof data.toggles !== 'object') warnings.push('"toggles" is not an object (coerced)');

  return { ok: errors.length === 0, errors, warnings };
}
