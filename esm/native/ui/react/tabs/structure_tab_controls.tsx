import { OptionButton } from '../components/index.js';
import { useApp, useCfgSelectorShallow } from '../hooks.js';
import { setCfgBoardMaterial } from '../actions/store_actions.js';
import { setWardrobeType } from '../actions/room_actions.js';
import { patchViaActions, requestBuilderStructuralRefresh } from '../../../services/api.js';
import { selectBoardMaterial, selectWardrobeType } from '../selectors/config_selectors.js';

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

const STRUCTURE_TYPE_OPTIONS: readonly StructureTypeOption[] = [
  { id: 'hinged', iconClassName: 'fas fa-door-open wp-r-type-icon', label: 'פתיחה' },
  { id: 'sliding', iconClassName: 'fas fa-exchange-alt wp-r-type-icon', label: 'הזזה' },
];

const STRUCTURE_BOARD_MATERIAL_OPTIONS: readonly StructureBoardMaterialOption[] = [
  { id: 'sandwich', label: "סנדביץ'", selected: (value: string) => value !== 'melamine' },
  { id: 'melamine', label: 'מלמין', selected: (value: string) => value === 'melamine' },
];

function applyImmediateStructuralConfigMutation(
  app: unknown,
  source: string,
  configPatch: Record<string, unknown>,
  applyDirectMutation: () => void
): void {
  const meta = { source, immediate: true, noBuild: true };
  const applied =
    typeof patchViaActions === 'function' ? patchViaActions(app, { config: configPatch }, meta) : false;
  if (!applied) applyDirectMutation();
  if (typeof requestBuilderStructuralRefresh === 'function') {
    requestBuilderStructuralRefresh(app, { source, immediate: false, force: false, triggerRender: false });
  }
}

export function TypeSelector() {
  const app = useApp();
  const { wardrobeType, boardMaterial } = useCfgSelectorShallow(cfg => ({
    wardrobeType: selectWardrobeType(cfg),
    boardMaterial: selectBoardMaterial(cfg),
  }));

  return (
    <div
      className="type-selector wp-r-type-selector wp-r-wardrobe-type-selector"
      data-testid="structure-type-selector"
    >
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
                  () => {
                    setCfgBoardMaterial(app, option.id, {
                      source: 'react:boardMaterial',
                      immediate: true,
                      noBuild: true,
                    });
                  }
                );
              }}
            >
              <span className="wp-r-btn-label">{option.label}</span>
            </OptionButton>
          );
        })}
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
