// Corner connector interior special-layout public facade.
//
// Keep this file as a narrow import-compatible seam. Implementation ownership
// lives in focused sibling modules so geometry, metrics, content planning, and
// scene mutation do not grow back into one god-helper.

import {
  createLeftShelvesContentsPlan as createLeftShelvesContentsPlanImpl,
  createPentagonTopContentsPlan as createPentagonTopContentsPlanImpl,
} from './corner_connector_interior_special_contents.js';

export type {
  CornerConnectorSpecialInteriorFlowParams,
  CornerConnectorSpecialMetrics,
} from './corner_connector_interior_special_types.js';

export {
  createEqualShelfBottomYs,
  resolveCornerConnectorSpecialMetrics,
} from './corner_connector_interior_special_metrics.js';

export { createInsetPolygon } from './corner_connector_interior_special_geometry.js';

export { applyCornerConnectorSpecialInterior } from './corner_connector_interior_special_apply.js';

export function createLeftShelvesContentsPlan(args: Parameters<typeof createLeftShelvesContentsPlanImpl>[0]) {
  return createLeftShelvesContentsPlanImpl(args);
}

export function createPentagonTopContentsPlan(args: Parameters<typeof createPentagonTopContentsPlanImpl>[0]) {
  return createPentagonTopContentsPlanImpl(args);
}
