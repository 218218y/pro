import type { ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import type { RenderTabDisplaySectionModel } from './use_render_tab_controller_contracts.js';

export function RenderDisplaySection(props: { model: RenderTabDisplaySectionModel }): ReactElement {
  const model = props.model;

  return (
    <div className="control-section">
      <span className="section-title">תצוגה</span>

      <ToggleRow
        label={
          <>
            <i className="fas fa-ruler-combined"></i> הצג מידות
          </>
        }
        checked={model.showDimensions}
        onChange={model.onToggleShowDimensions}
        testId="toggle-show-dimensions"
      />

      <ToggleRow
        label={
          <>
            <i className="fas fa-hanger"></i> קולב למוט (תצוגה)
          </>
        }
        checked={model.showHanger && !model.showContents}
        onChange={model.onToggleShowHanger}
      />

      <ToggleRow
        label={
          <>
            <i className="fas fa-tshirt"></i> הצג תכולה (בגדים)
          </>
        }
        checked={model.showContents}
        onChange={model.onToggleShowContents}
      />

      <ToggleRow
        label={
          <>
            <i className="fas fa-pencil-ruler"></i> מצב סקיצה (שחור/לבן)
          </>
        }
        checked={model.sketchMode}
        onChange={model.onToggleSketchMode}
        testId="toggle-sketch-mode"
      />

      <ToggleRow
        label={
          <>
            <i className="fas fa-hand-pointer"></i> פתיחת כל הארון בלחיצה
          </>
        }
        checked={model.globalClickUi}
        onChange={model.onToggleGlobalClick}
        testId="toggle-global-click"
      />
    </div>
  );
}
