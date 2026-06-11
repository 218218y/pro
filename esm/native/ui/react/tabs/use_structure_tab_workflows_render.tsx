import { useCallback } from 'react';
import type { ReactElement } from 'react';

import type { StructureTabStructuralController } from './structure_tab_structural_controller_contracts.js';
import type { StructureStackLinkField } from './use_structure_tab_workflows_contracts.js';

export function useStructureTabRenderStackLinkBadge(
  structuralController: StructureTabStructuralController
): (field: StructureStackLinkField, isManual: boolean) => ReactElement {
  return useCallback(
    (field: StructureStackLinkField, isManual: boolean) => {
      const isAuto = !isManual;
      const title = isAuto ? 'אוטומטי: מסונכרן לארון הראשי' : 'ידני: מידה נפרדת לחלק התחתון';

      return (
        <button
          type="button"
          className={
            isAuto
              ? 'wp-r-mini-link-toggle wp-r-mini-link-toggle--auto wp-r-styled-tooltip hint-bottom'
              : 'wp-r-mini-link-toggle wp-r-mini-link-toggle--manual wp-r-styled-tooltip hint-bottom'
          }
          aria-pressed={isManual}
          data-tooltip={title}
          tabIndex={-1}
          onClick={() => structuralController.setStackSplitLowerLinkMode(field, !isManual)}
        >
          <i className={isAuto ? 'fas fa-link' : 'fas fa-unlink'} aria-hidden="true" />
          <span>{isAuto ? 'אוטומטי' : 'ידני'}</span>
        </button>
      );
    },
    [structuralController]
  );
}
