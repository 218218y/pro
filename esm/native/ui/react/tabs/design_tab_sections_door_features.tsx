import type { ReactElement } from 'react';

import { ModeToggleButton, ToggleRow } from '../components/index.js';
import type { DoorFeaturesSectionProps } from './design_tab_sections_contracts.js';

export function DoorFeaturesSection(props: DoorFeaturesSectionProps): ReactElement | null {
  const model = props.model;
  if (model.wardrobeType !== 'hinged' && model.wardrobeType !== 'sliding') return null;

  return (
    <div className="control-section" data-testid="design-door-features-section">
      <span className="section-title">חריטה ודלתות</span>

      <ToggleRow
        label="חריטה (CNC) בחזיתות"
        checked={model.groovesEnabled}
        onChange={checked => model.setFeatureToggle('groovesEnabled', checked)}
        testId="design-grooves-toggle"
      />

      {model.groovesEnabled ? (
        <div className="wp-r-editmode-block">
          <ModeToggleButton
            active={model.grooveActive}
            icon={
              <i className={model.grooveActive ? 'fas fa-check' : 'fas fa-pencil-alt'} aria-hidden="true" />
            }
            onClick={model.toggleGrooveEdit}
            data-testid="design-groove-mode-button"
          >
            {model.grooveActive ? 'סיום עריכה' : 'הוסף/הסר חריטה'}
          </ModeToggleButton>

          {model.grooveActive ? (
            <div className="wp-r-mt-2 wp-r-groove-lines-block">
              <label className="wp-r-label wp-r-label--center wp-r-groove-lines-label">מספר חריטות</label>
              <div className="wp-r-groove-lines-row">
                <button
                  type="button"
                  className="btn btn-light btn-inline wp-r-groove-reset-btn"
                  onClick={model.resetGrooveLinesCount}
                >
                  <i className="fas fa-undo-alt" aria-hidden="true" />
                  <span>ברירת מחדל</span>
                </button>
                <input
                  type="number"
                  className={
                    model.grooveLinesCountIsAuto
                      ? 'wp-r-input wp-r-groove-lines-input wp-r-groove-lines-input--auto'
                      : 'wp-r-input wp-r-groove-lines-input'
                  }
                  value={model.grooveLinesCount}
                  placeholder="אוטומטי"
                  step={1}
                  inputMode="numeric"
                  aria-label="מספר חריטות"
                  data-testid="design-groove-lines-input"
                  onFocus={(e: import('react').FocusEvent<HTMLInputElement>) => {
                    if (e.currentTarget.value) e.currentTarget.select();
                  }}
                  onKeyDown={(e: import('react').KeyboardEvent<HTMLInputElement>) => {
                    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.currentTarget.value.trim()) {
                      e.preventDefault();
                      model.setGrooveLinesCount(10);
                    }
                  }}
                  onChange={(e: import('react').ChangeEvent<HTMLInputElement>) => {
                    const rawValue = e.target.value.trim();
                    if (!rawValue) {
                      model.resetGrooveLinesCount();
                      return;
                    }
                    const next = Number(rawValue);
                    if (!Number.isFinite(next) || next < 1) return;
                    model.setGrooveLinesCount(next);
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="wp-r-editmode-hint">לחץ על דלת כדי לסמן חריטה או לבטל אותה.</div>
        </div>
      ) : null}

      {model.wardrobeType === 'hinged' ? (
        <>
          <div className="wp-r-toggle-divider" />

          <ToggleRow
            label="דלתות חתוכות (Split)"
            checked={model.splitDoors}
            onChange={checked => model.setFeatureToggle('splitDoors', checked)}
            testId="design-split-doors-toggle"
          />

          {model.splitDoors ? (
            <div className="wp-r-editmode-block">
              <ModeToggleButton
                active={model.splitActive && !model.splitIsCustom}
                icon={
                  <i
                    className={model.splitActive && !model.splitIsCustom ? 'fas fa-check' : 'fas fa-cut'}
                    aria-hidden="true"
                  />
                }
                onClick={model.toggleSplitEdit}
                data-testid="design-split-mode-button"
              >
                {model.splitActive && !model.splitIsCustom ? 'סיום עריכה' : 'הוסף/הסר חיתוך דלת'}
              </ModeToggleButton>

              <div className="wp-r-editmode-hint">לחץ על החלק העליון/התחתון של הדלת כדי לשנות חיתוך.</div>

              <ModeToggleButton
                active={model.splitIsCustom}
                icon={
                  <i className={model.splitIsCustom ? 'fas fa-check' : 'fas fa-cut'} aria-hidden="true" />
                }
                onClick={model.toggleSplitCustomEdit}
                className="wp-r-mt-2 wp-r-split-custom-btn"
                data-testid="design-split-custom-mode-button"
              >
                {model.splitIsCustom ? 'סיום עריכה' : 'חיתוך דלתות ידני'}
              </ModeToggleButton>

              <div className={model.splitIsCustom ? 'wp-r-editmode-hint' : 'wp-r-editmode-hint hidden'}>
                הזז עכבר לראות קו חיתוך. לחץ להוספה. לחץ שוב על קו קיים כדי להסיר. אפשר כמה חיתוכים.
              </div>
            </div>
          ) : null}

          <div className="wp-r-toggle-divider" />

          <ToggleRow
            label="הסרת דלתות (נישה פתוחה)"
            checked={model.removeDoorsEnabled}
            onChange={checked => model.setFeatureToggle('removeDoorsEnabled', checked)}
            testId="design-remove-doors-toggle"
          />

          {model.removeDoorsEnabled ? (
            <div className="wp-r-editmode-block">
              <ModeToggleButton
                active={model.removeDoorActive}
                icon={
                  <i
                    className={model.removeDoorActive ? 'fas fa-check' : 'fas fa-trash'}
                    aria-hidden="true"
                  />
                }
                onClick={model.toggleRemoveDoorEdit}
                data-testid="design-remove-door-mode-button"
              >
                {model.removeDoorActive ? 'סיום עריכה' : 'הסר/החזר דלת'}
              </ModeToggleButton>

              <div className="wp-r-editmode-hint">לחץ על דלת כדי להסיר או להחזיר אותה לסקיצה.</div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
