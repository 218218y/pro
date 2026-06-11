import type { ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import type { SettingsVisualDisplaySectionModel } from './use_settings_visual_controller_contracts.js';

export function SettingsVisualDisplaySection(props: {
  model: SettingsVisualDisplaySectionModel;
}): ReactElement {
  const model = props.model;

  return (
    <div className="control-section">
      <span className="section-title">תצוגה</span>

      <ToggleRow
        label={
          <>
            <i className="fas fa-moon"></i> מצב כהה
          </>
        }
        checked={model.darkMode}
        onChange={model.onToggleDarkMode}
        testId="toggle-dark-mode"
      />

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
