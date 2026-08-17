import type { AppContainer } from '../../types';
import { __wp_reportPickingIssue } from '../../esm/native/services/canvas_picking_core_support_errors.js';

declare const App: AppContainer;

const failFastResult: never = __wp_reportPickingIssue(
  App,
  new Error('type-contract probe'),
  { op: 'typeContract.failFast' },
  { failFast: true }
);

export { failFastResult };
