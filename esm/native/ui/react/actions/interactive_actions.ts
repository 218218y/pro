// React UI actions: interactive shell helpers

import type { AppContainer } from '../../../../../types';

import { setDoorsOpen } from '../../../services/api.js';
import { reportUiNonFatal } from '../../feedback_shared.js';

export function closeInteractiveOnGlobalOff(app: AppContainer): void {
  try {
    setDoorsOpen(app, false, { forceUpdate: true });
  } catch (error) {
    reportUiNonFatal(app, 'interactiveActions.closeInteractiveOnGlobalOff', error, {
      where: 'native/ui/react/actions',
    });
  }
}
