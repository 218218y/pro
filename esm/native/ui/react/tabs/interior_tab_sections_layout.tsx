import { useRef, useState, type ReactElement } from 'react';

import { OptionButton } from '../components/index.js';
import { cx } from './interior_tab_helpers.js';
import { InteriorLayoutManualControls } from './interior_layout_manual_controls.js';
import { InteriorToolCardHeader } from './interior_tab_sections_controls.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

const LAYOUT_METHODS = [
  { id: 'presets', label: 'תבניות', icon: 'fas fa-th-large' },
  { id: 'grid', label: 'לפי תאים', icon: 'fas fa-grip-lines' },
  { id: 'sketch', label: 'לפי סקיצה', icon: 'fas fa-pencil-ruler' },
] as const;

type LayoutMethod = (typeof LAYOUT_METHODS)[number]['id'];

const METHOD_HINTS: Record<LayoutMethod, string> = {
  presets: 'בחרו תבנית ולחצו על תא כדי למלא אותו.',
  grid: 'בחרו פריט והציבו אותו לפי קווי החלוקה בתא.',
  sketch: 'בחרו פריט ולחצו בתא בגובה הרצוי.',
};

function readActiveMethod(props: InteriorLayoutSectionProps): LayoutMethod | null {
  if (props.isLayoutMode) return props.layoutType === 'full_boring' ? 'sketch' : 'presets';
  if (props.isBraceShelvesMode || props.isSketchDivisionToolActive) return 'sketch';
  if (props.isManualLayoutMode && !props.isSketchToolActive) return 'grid';
  return null;
}

export function InteriorLayoutSection(props: InteriorLayoutSectionProps): ReactElement {
  const [lastMethod, setLastMethod] = useState<LayoutMethod>('presets');
  const methodButtons = useRef<Partial<Record<LayoutMethod, HTMLButtonElement>>>({});
  const activeMethod = readActiveMethod(props);
  const method = activeMethod ?? lastMethod;
  const isBoring = props.isLayoutMode && props.layoutType === 'full_boring';
  const isEditingShelf = props.isBraceShelvesMode;
  let hint = METHOD_HINTS[method];
  if (isBoring) hint = 'לחצו על תא להוספה או להסרה של חורי מדף במרווח 3 ס״מ.';
  if (isEditingShelf) hint = 'לחצו על מדף להמרה או להסרה, או על מקום פנוי להוספה.';
  if (activeMethod === 'grid' && props.manualTool === 'storage') {
    hint = 'לחצו על תא להוספה או להסרה של אוגר מצעים.';
  }

  function exitToMethod(nextMethod: LayoutMethod) {
    props.exitLayoutOrManual();
    methodButtons.current[nextMethod]?.focus({ preventScroll: true });
  }

  function renderLayoutOptions(group: 'presets' | 'edits') {
    return (
      <div
        className="wp-interior-layout-options"
        role="group"
        aria-label={group === 'presets' ? 'תבניות לתא' : 'המרה וחירור'}
      >
        {props.layoutTypes
          .filter(option => option.group === group)
          .map(option => {
            const selected =
              option.id === 'brace_shelves'
                ? isEditingShelf && !props.isRegularShelfMode
                : option.id === 'regular_shelf'
                  ? props.isRegularShelfMode
                  : props.isLayoutMode && props.layoutType === option.id;
            return (
              <OptionButton
                key={option.id}
                selected={selected}
                density="micro"
                icon={<i className={option.icon} aria-hidden="true" />}
                testId={`interior-layout-${option.id}`}
                onClick={() => props.enterLayout(option.id)}
              >
                {option.label}
              </OptionButton>
            );
          })}
      </div>
    );
  }

  return (
    <div
      className={cx(
        'wp-tool-card',
        'wp-tool-card--layout',
        'wp-interior-layout',
        activeMethod && 'is-active'
      )}
      data-testid="interior-layout"
      dir="rtl"
    >
      <InteriorToolCardHeader
        title="חלוקת פנים"
        active={activeMethod !== null}
        onExit={() => {
          setLastMethod(method);
          exitToMethod(method);
        }}
        exitButtonTestId="interior-layout-finish"
      />

      <div className="wp-interior-layout-methods" role="group" aria-label="שיטת חלוקה">
        {LAYOUT_METHODS.map(option => (
          <OptionButton
            key={option.id}
            ref={button => {
              if (button) methodButtons.current[option.id] = button;
              else delete methodButtons.current[option.id];
            }}
            selected={option.id === method}
            density="micro"
            icon={<i className={option.icon} aria-hidden="true" />}
            testId={`interior-layout-method-${option.id}`}
            onClick={() => {
              setLastMethod(option.id);
              if (activeMethod && option.id !== activeMethod) exitToMethod(option.id);
            }}
          >
            {option.label}
          </OptionButton>
        ))}
      </div>

      <p className="wp-interior-layout-help">{hint}</p>

      {method === 'presets' ? (
        renderLayoutOptions('presets')
      ) : (
        <InteriorLayoutManualControls {...props} method={method} />
      )}

      {method === 'sketch' ? (
        <details className="wp-interior-layout-edits">
          <summary>המרת מדפים וחירור</summary>
          {renderLayoutOptions('edits')}
        </details>
      ) : null}
    </div>
  );
}
