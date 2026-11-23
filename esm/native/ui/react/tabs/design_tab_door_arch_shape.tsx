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
    { value: 'straight', label: labels.straight, area: 'M7 11h22v26H7z', cut: 'M3 25h30' },
    {
      value: 'arch',
      label: 'קשת למעלה',
      area: 'M7 37V21a11 11 0 0 1 22 0v16z',
      cut: 'M3 25a15 15 0 0 1 30 0',
    },
    {
      value: 'arch-down',
      label: 'קשת למטה',
      area: 'M7 7h22v16a11 11 0 0 1 -22 0z',
      cut: 'M3 19a15 15 0 0 0 30 0',
    },
    {
      value: 'arch-both',
      label: 'שתי קשתות',
      area: 'M7 15a11 7 0 0 1 22 0v14a11 7 0 0 1 -22 0z',
      cut: 'M3 14a15 7 0 0 1 30 0M3 30a15 7 0 0 0 30 0',
    },
    {
      value: 'ellipse',
      label: 'אליפסה',
      area: 'M6 22a12 15 0 1 1 24 0a12 15 0 1 1 -24 0z',
      cut: 'M3 22a15 14 0 1 1 30 0a15 14 0 1 1 -30 0z',
    },
  ] as const;
  return (
    <div className="wp-r-mt-2">
      <OptionButtonGroup columns={2} density="compact" label={labels.group}>
        {options.map(({ value, label, area, cut }) => (
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
              {props.tool === 'cut' ? (
                <path d={cut} />
              ) : (
                <path d={area} fill="currentColor" fillOpacity=".12" />
              )}
              {props.tool === 'groove' && <path d="M12 26V19M18 26V19M24 26V19" />}
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
