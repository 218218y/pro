import type { ReactElement } from 'react';
import type { DoorPlacementShape } from '../../../../../types/maps.js';
import { OptionButton, OptionButtonGroup } from '../components/index.js';

type ShapeTool = 'cut' | 'mirror' | 'groove';

export function DoorArchShapeOptions(props: {
  tool: ShapeTool;
  shape: DoorPlacementShape;
  onChange: (shape: DoorPlacementShape) => void;
}): ReactElement {
  const labels = {
    cut: { group: 'צורת חיתוך', straight: 'קו ישר' },
    mirror: { group: 'צורת המראה', straight: 'מלבן' },
    groove: { group: 'צורת החריטה', straight: 'מלבן' },
  }[props.tool];
  const options = [
    {
      value: 'straight',
      label: labels.straight,
      area: 'M7 11h22v26H7z',
      cut: 'M3 25h30',
      grooves: 'M12 14v20M18 14v20M24 14v20',
    },
    {
      value: 'arch',
      label: 'קשת למעלה',
      area: 'M7 37V21a11 11 0 0 1 22 0v16z',
      cut: 'M3 25a15 15 0 0 1 30 0',
      grooves: 'M10 16v18M18 12v22M26 16v18',
    },
    {
      value: 'arch-down',
      label: 'קשת למטה',
      area: 'M7 7h22v16a11 11 0 0 1 -22 0z',
      cut: 'M3 19a15 15 0 0 0 30 0',
      grooves: 'M10 10v18M18 10v22M26 10v18',
    },
    {
      value: 'arch-both',
      label: 'שתי קשתות',
      area: 'M7 15a11 7 0 0 1 22 0v14a11 7 0 0 1 -22 0z',
      cut: null,
      grooves: 'M12 11v22M18 10v24M24 11v22',
    },
    {
      value: 'ellipse',
      label: 'אליפסה',
      area: 'M6 22a12 15 0 1 1 24 0a12 15 0 1 1 -24 0z',
      cut: null,
      grooves: 'M11 13v18M18 10v24M25 13v18',
    },
  ] as const;
  return (
    <div className="wp-r-mt-2">
      <OptionButtonGroup columns={2} density="compact" label={labels.group}>
        {options
          .filter(option => props.tool !== 'cut' || option.cut !== null)
          .map(({ value, label, area, cut, grooves }) => (
            <OptionButton
              key={value}
              density="compact"
              layout="iconRow"
              selected={props.shape === value}
              onClick={() => props.onChange(value)}
              testId={`design-${props.tool}-shape-${value}`}
            >
              <svg
                viewBox="0 0 36 44"
                width="28"
                height="34"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="3" y="2" width="30" height="40" rx="2" opacity=".45" />
                {props.tool === 'cut' && cut ? (
                  <path d={cut} />
                ) : (
                  <path d={area} fill="currentColor" fillOpacity=".12" />
                )}
                {props.tool === 'groove' && <path d={grooves} />}
              </svg>
              <span>{label}</span>
            </OptionButton>
          ))}
      </OptionButtonGroup>
      {props.shape !== 'straight' && (
        <div className="wp-r-editmode-hint">
          {props.shape === 'arch-down'
            ? 'בחר את הנקודה התחתונה של הקשת.'
            : props.shape === 'arch' && props.tool !== 'mirror'
              ? 'בחר את פסגת הקשת.'
              : 'בחר את מרכז הצורה.'}{' '}
          {props.tool === 'cut' && 'החזק Shift לנעילת הגובה. '}
          לצורה על שתי דלתות, כוון סמוך לתפר ביניהן. לחץ על צורה קיימת להסרה.
        </div>
      )}
    </div>
  );
}
