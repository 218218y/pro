import type { ChangeEvent, FocusEvent } from 'react';

import { OptionButton } from '../components/index.js';
import { useApp, useCfgSelectorShallow } from '../hooks.js';
import { setCfgBoardMaterial, setCfgDoorMountMode } from '../actions/store_actions.js';
import { setWardrobeType } from '../actions/room_actions.js';
import { applyImmediateStructuralConfigMutation } from '../actions/structural_build_refresh_actions.js';
import { cfgSetScalar } from '../../../services/api.js';
import {
  selectBoardMaterial,
  selectDoorMountMode,
  selectDoorMountThicknessControls,
  selectWardrobeType,
} from '../selectors/config_selectors.js';
import {
  DOOR_MOUNT_THICKNESS_DIMENSIONS,
  normalizeDoorMountThicknessCm,
  type DoorMountThicknessConfigKey,
} from '../../../../shared/wardrobe_dimension_tokens_shared.js';

export { DimField } from './structure_tab_dim_field.js';
export { OptionalDimField } from './structure_tab_optional_dim_field.js';

type StructureTypeOption = {
  id: 'hinged' | 'sliding';
  iconClassName: string;
  label: string;
};

type StructureBoardMaterialOption = {
  id: 'sandwich' | 'melamine';
  label: string;
  selected: (value: string) => boolean;
};

type StructureDoorMountOption = {
  id: 'overlay' | 'inset';
  label: string;
};

const STRUCTURE_TYPE_OPTIONS: readonly StructureTypeOption[] = [
  { id: 'hinged', iconClassName: 'fas fa-door-open wp-r-type-icon', label: 'פתיחה' },
  { id: 'sliding', iconClassName: 'fas fa-exchange-alt wp-r-type-icon', label: 'הזזה' },
];

const STRUCTURE_BOARD_MATERIAL_OPTIONS: readonly StructureBoardMaterialOption[] = [
  { id: 'sandwich', label: "סנדביץ'", selected: (value: string) => value !== 'melamine' },
  { id: 'melamine', label: 'מלמין', selected: (value: string) => value === 'melamine' },
];

const STRUCTURE_DOOR_MOUNT_OPTIONS: readonly StructureDoorMountOption[] = [
  { id: 'overlay', label: 'דלת חיצונית' },
  { id: 'inset', label: 'דלת שקועה' },
];

function applyImmediateStructuralScalarMutation(
  app: unknown,
  source: string,
  key: DoorMountThicknessConfigKey,
  value: number | null
): void {
  applyImmediateStructuralConfigMutation(app, source, { [key]: value }, meta => {
    cfgSetScalar(app, key, value, meta);
  });
}

function formatThicknessInputValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '';
}

export function TypeSelector(props: { hideTypeOptions?: boolean } = {}) {
  const app = useApp();
  const { wardrobeType, boardMaterial, doorMountMode } = useCfgSelectorShallow(cfg => ({
    wardrobeType: selectWardrobeType(cfg),
    boardMaterial: selectBoardMaterial(cfg),
    doorMountMode: selectDoorMountMode(cfg),
  }));
  const doorMountThickness = useCfgSelectorShallow(selectDoorMountThicknessControls);

  return (
    <div
      className="type-selector wp-r-type-selector wp-r-wardrobe-type-selector"
      data-testid="structure-type-selector"
    >
      {!props.hideTypeOptions ? (
        <div className="wp-r-wardrobe-type-row" data-testid="structure-type-row">
          {STRUCTURE_TYPE_OPTIONS.map(option => {
            const selected = wardrobeType === option.id;
            return (
              <OptionButton
                key={option.id}
                selected={selected}
                className={readStructureTypeOptionClassName(selected)}
                data-testid={`structure-type-${option.id}-button`}
                aria-pressed={selected}
                data-structure-type={option.id}
                icon={<i className={option.iconClassName} aria-hidden="true" />}
                onClick={() => {
                  setWardrobeType(app, option.id);
                }}
              >
                <span className="wp-r-btn-label">{option.label}</span>
              </OptionButton>
            );
          })}
        </div>
      ) : null}

      <div
        className="wp-r-wardrobe-material-row"
        aria-label="חומר גוף"
        data-testid="structure-board-material-row"
      >
        {STRUCTURE_BOARD_MATERIAL_OPTIONS.map(option => {
          const selected = option.selected(boardMaterial);
          return (
            <OptionButton
              key={option.id}
              selected={selected}
              density="compact"
              className={readStructureTypeOptionClassName(selected, { compact: true, material: true })}
              data-testid={`structure-board-material-${option.id}-button`}
              aria-pressed={selected}
              data-board-material={option.id}
              onClick={() => {
                if (selected) return;
                applyImmediateStructuralConfigMutation(
                  app,
                  'react:boardMaterial',
                  { boardMaterial: option.id },
                  meta => {
                    setCfgBoardMaterial(app, option.id, meta);
                  }
                );
              }}
            >
              <span className="wp-r-btn-label">{option.label}</span>
            </OptionButton>
          );
        })}
      </div>

      <div className="wp-r-door-mount-controls" data-testid="structure-door-mount-controls">
        {wardrobeType === 'hinged' ? (
          <div
            className="wp-r-wardrobe-door-mount-row"
            aria-label="סוג התקנת דלת"
            data-testid="structure-door-mount-row"
          >
            {STRUCTURE_DOOR_MOUNT_OPTIONS.map(option => {
              const selected = doorMountMode === option.id;
              return (
                <OptionButton
                  key={option.id}
                  selected={selected}
                  density="compact"
                  className={readStructureTypeOptionClassName(selected, { compact: true, material: true })}
                  data-testid={`structure-door-mount-${option.id}-button`}
                  aria-pressed={selected}
                  data-door-mount-mode={option.id}
                  onClick={() => {
                    if (selected) return;
                    applyImmediateStructuralConfigMutation(
                      app,
                      'react:doorMountMode',
                      { doorMountMode: option.id },
                      meta => {
                        setCfgDoorMountMode(app, option.id, meta);
                      }
                    );
                  }}
                >
                  <span className="wp-r-btn-label">{option.label}</span>
                </OptionButton>
              );
            })}
          </div>
        ) : null}
        <div className="wp-r-door-thickness-fields" data-testid="structure-door-thickness-fields">
          <DoorMountThicknessField
            id="structure-frame-thickness"
            label="עובי מסגרת"
            valueCm={doorMountThickness.frameThicknessCm}
            isAutomatic={doorMountThickness.frameOverrideCm == null}
            resetLabel="איפוס עובי מסגרת"
            inputTestId="structure-frame-thickness-input"
            resetTestId="structure-frame-thickness-reset"
            onChange={value => {
              applyImmediateStructuralScalarMutation(
                app,
                'react:doorMountThickness:frame',
                doorMountThickness.frameKey,
                value
              );
            }}
          />
          <DoorMountThicknessField
            id="structure-shelf-thickness"
            label="עובי מדפים"
            valueCm={doorMountThickness.shelfThicknessCm}
            isAutomatic={doorMountThickness.shelfOverrideCm == null}
            resetLabel="איפוס המידה"
            inputTestId="structure-shelf-thickness-input"
            resetTestId="structure-shelf-thickness-reset"
            onChange={value => {
              applyImmediateStructuralScalarMutation(
                app,
                'react:doorMountThickness:shelf',
                doorMountThickness.shelfKey,
                value
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DoorMountThicknessField(props: {
  id: string;
  label: string;
  valueCm: number;
  isAutomatic: boolean;
  resetLabel: string;
  inputTestId: string;
  resetTestId: string;
  onChange: (value: number | null) => void;
}) {
  const inputValue = formatThicknessInputValue(props.valueCm);
  return (
    <div className="wp-r-door-thickness-field">
      <label className="wp-r-door-thickness-label" htmlFor={props.id}>
        <span>{props.label}</span>
        {props.isAutomatic ? <span className="wp-r-door-thickness-auto">אוטומטי</span> : null}
      </label>
      <div className="wp-r-door-thickness-input-row">
        <input
          id={props.id}
          className="wp-r-door-thickness-input"
          data-testid={props.inputTestId}
          type="number"
          inputMode="decimal"
          min={DOOR_MOUNT_THICKNESS_DIMENSIONS.minCm}
          max={DOOR_MOUNT_THICKNESS_DIMENSIONS.maxCm}
          step={DOOR_MOUNT_THICKNESS_DIMENSIONS.stepCm}
          value={inputValue}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            event.currentTarget.select();
          }}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.currentTarget.value;
            props.onChange(rawValue === '' ? null : normalizeDoorMountThicknessCm(rawValue));
          }}
        />
        <button
          type="button"
          className="btn btn-light btn-inline wp-r-groove-reset-btn wp-r-cell-dims-reset-dim-btn wp-r-door-thickness-reset-btn wp-r-styled-tooltip hint-bottom"
          data-testid={props.resetTestId}
          aria-label={props.resetLabel}
          title={props.resetLabel}
          data-tooltip={props.resetLabel}
          disabled={props.isAutomatic}
          onClick={() => props.onChange(null)}
        >
          <i className="fas fa-undo-alt" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function readStructureTypeOptionClassName(
  selected: boolean,
  opts: { compact?: boolean; material?: boolean } = {}
): string {
  return [
    'type-option',
    opts.compact ? 'type-option--compact' : '',
    selected ? 'selected active' : '',
    'wp-r-type-option',
    opts.material ? 'wp-r-material-option' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
