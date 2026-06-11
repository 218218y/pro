// Corner wing emission owner.
//
// Public canonical entrypoint for corner emission. Heavy connector and wing
// geometry live in dedicated helper modules to keep this owner file thin.

import { emitCornerConnector } from './corner_connector_emit.js';
import { emitCornerWingExtension } from './corner_wing_extension_emit.js';

export { emitCornerConnector, emitCornerWingExtension };
