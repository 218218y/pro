import type { ReactElement } from 'react';
import { OptionButton, OptionButtonGroup } from '../components/index.js';

type ShapeTool = 'cut' | 'mirror' | 'groove';

export function DoorArchShapeOptions(props: {
  tool: ShapeTool;
  arched: boolean;
  onChange: (arched: boolean) => void;
}): ReactElement {
  const labels = {
    cut: { group: 'צורת חיתוך', straight: 'קו ישר' },
    mirror: { group: 'צורת המראה', straight: 'מלבן' },
    groove: { group: 'צורת החריטה', straight: 'מלבן' },
  }[props.tool];
  return (
    <div className="wp-r-mt-2">
      <OptionButtonGroup columns={2} density="compact" label={labels.group}>
        {[false, true].map(arch => (
          <OptionButton
            key={arch ? 'arch' : 'straight'}
            density="compact"
            layout="iconRow"
            selected={props.arched === arch}
            onClick={() => props.onChange(arch)}
            testId={`design-${props.tool}-shape-${arch ? 'arch' : 'straight'}`}
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
                <path d={arch ? 'M3 25a15 15 0 0 1 30 0' : 'M3 25h30'} />
              ) : (
                <path
                  d={arch ? 'M7 37V21a11 11 0 0 1 22 0v16z' : 'M7 11h22v26H7z'}
                  fill="currentColor"
                  fillOpacity=".12"
                />
              )}
              {props.tool === 'groove' ? (
                <path d={arch ? 'M12 35V21M18 35V14M24 35V21' : 'M12 35V13M18 35V13M24 35V13'} />
              ) : null}
            </svg>
            <span>{arch ? 'ראש מעוגל' : labels.straight}</span>
          </OptionButton>
        ))}
      </OptionButtonGroup>
      {props.arched ? (
        <div className="wp-r-editmode-hint">
          {props.tool === 'groove'
            ? 'בחר את פסגת החריטה. גובה ריק מושך את החריטה עד התחתית. כשמזינים גובה, החריטה נמדדת מהפסגה כלפי מטה.'
            : props.tool === 'cut'
              ? 'גובה הסמן קובע את פסגת החיתוך. החזק Shift כדי לנעול את הגובה במעבר בין דלתות.'
              : 'הזז את הסמן כדי למקם את המראה.'}{' '}
          לקשת על שתי דלתות, כוון סמוך לתפר ביניהן. לחץ על קשת קיימת להסרתה.
        </div>
      ) : null}
    </div>
  );
}
