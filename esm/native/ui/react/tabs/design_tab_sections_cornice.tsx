import {
  CORNICE_DIMENSION_MIN_CM,
  resolveCorniceDimensionsM,
} from '../../../../shared/dimensions/carcass_cornice_render_policy.js';
import { StructurePlatformOverhangField } from './structure_tab_platform_overhang_field.js';
import type { ReactElement } from 'react';

import { ToggleRow } from '../components/index.js';
import { DesignTabTypeOption } from './design_tab_sections_controls.js';
import type { CorniceSectionProps } from './design_tab_sections_contracts.js';

export function CorniceSection(props: CorniceSectionProps): ReactElement | null {
  const model = props.model;
  if (model.isChestMode || model.noMainWardrobeActive) return null;

  const defaults = resolveCorniceDimensionsM(model.corniceType);
  const fields = [
    { key: 'sideCm', label: 'מהצד', defaultValue: defaults.sideM * 100 },
    { key: 'frontCm', label: 'מהחזית', defaultValue: defaults.frontM * 100 },
    { key: 'heightCm', label: 'גובה', defaultValue: defaults.heightM * 100 },
  ] as const;

  return (
    <div className="control-section">
      <span className="section-title">תוספות גובה</span>

      <ToggleRow label="הוסף קרניז עליון (כתר)" checked={model.hasCornice} onChange={model.setHasCornice} />

      {model.hasCornice ? (
        <div className="wp-r-mt-2">
          <div className="type-selector wp-r-type-selector">
            <DesignTabTypeOption
              selected={model.corniceType === 'classic'}
              onClick={() => model.setCorniceType('classic')}
            >
              רגיל
            </DesignTabTypeOption>
            <DesignTabTypeOption
              selected={model.corniceType === 'wave'}
              onClick={() => model.setCorniceType('wave')}
            >
              גל
            </DesignTabTypeOption>
            <DesignTabTypeOption
              selected={model.corniceType === 'straight'}
              onClick={() => model.setCorniceType('straight')}
            >
              ישר
            </DesignTabTypeOption>
          </div>
          <div className="wp-r-door-thickness-fields wp-r-cornice-dimensions wp-r-mt-2">
            {fields.map(({ key, label, defaultValue }) => (
              <StructurePlatformOverhangField
                key={key}
                label={`${label} (ס״מ)`}
                value={model.corniceDimensions?.[key] ?? defaultValue}
                defaultValue={defaultValue}
                min={CORNICE_DIMENSION_MIN_CM[key]}
                resetTitle={`איפוס קרניז — ${label}`}
                onChange={value => model.setCorniceDimension(key, value)}
                onReset={() => model.setCorniceDimension(key, undefined)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
