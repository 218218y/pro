import type { ReactElement } from 'react';

import { OptionButton } from '../components/index.js';
import {
  InteriorSketchShelfDepthField,
  InteriorSketchStorageHeightField,
  SHELF_VARIANT_OPTIONS,
  WinterBraceShelfButton,
} from './interior_layout_sketch_shelves_section.js';
import { parseSketchShelfVariant } from './interior_tab_helpers.js';
import type { InteriorLayoutSectionProps } from './interior_tab_sections_shared.js';

type ManualLayoutControlsProps = InteriorLayoutSectionProps & { method: 'grid' | 'sketch' };
type ShelfVariant = (typeof SHELF_VARIANT_OPTIONS)[number]['variant'];

export function InteriorLayoutManualControls(props: ManualLayoutControlsProps): ReactElement {
  const isSketch = props.method === 'sketch';
  const hasActiveTool = isSketch
    ? props.isSketchDivisionToolActive
    : props.isManualLayoutMode && !props.isSketchToolActive;
  const tool = hasActiveTool ? props.manualTool : props.manualUiTool;
  const sketchVariant = isSketch && hasActiveTool ? parseSketchShelfVariant(props.manualToolRaw) : null;
  const isWinterBrace = sketchVariant === 'winter_brace';
  const activeShelfVariant =
    SHELF_VARIANT_OPTIONS.find(option => option.variant === sketchVariant)?.variant ??
    SHELF_VARIANT_OPTIONS.find(option => option.variant === props.gridShelfVariant)?.variant ??
    'regular';
  const showShelfSettings =
    tool === 'shelf' && !isWinterBrace && !(isSketch && (props.isBraceShelvesMode || props.isLayoutMode));

  function selectShelf(variant: ShelfVariant) {
    props.setGridShelfVariant(variant);
    if (isSketch) props.enterSketchDivision('shelf', variant);
    else if (!hasActiveTool || tool !== 'shelf') props.enterManual('shelf');
  }

  return (
    <>
      <div
        className={`wp-interior-layout-items${isSketch ? ' wp-interior-layout-items--sketch' : ''}`}
        role="group"
        aria-label="פריט להצבה"
      >
        {props.manualTools.map(option => (
          <OptionButton
            key={option.id}
            density="micro"
            selected={hasActiveTool && tool === option.id && !isWinterBrace}
            testId={`interior-manual-tool-${option.id}-button`}
            onClick={() => {
              if (option.id === 'shelf') selectShelf(activeShelfVariant);
              else if (isSketch) props.enterSketchDivision(option.id, activeShelfVariant);
              else props.enterManual(option.id);
            }}
          >
            {option.label}
          </OptionButton>
        ))}
        {isSketch ? (
          <WinterBraceShelfButton
            props={props}
            active={isWinterBrace}
            onSelect={() => {
              if (isWinterBrace) props.exitManual();
              else props.enterSketchShelfTool('winter_brace');
            }}
          />
        ) : null}
      </div>

      {!isSketch && tool !== 'storage' ? (
        <div className="wp-interior-layout-settings">
          <span className="wp-interior-layout-label">מספר חלוקות לגובה התא</span>
          <div className="wp-interior-layout-counts" role="group" aria-label="מספר חלוקות לגובה התא">
            {props.gridDivs.map(count => (
              <OptionButton
                key={count}
                density="micro"
                selected={props.currentGridDivisions === count}
                testId={`interior-layout-grid-count-${count}`}
                onClick={() => {
                  if (!hasActiveTool) props.enterManual(tool);
                  props.setGridDivisions(count);
                }}
              >
                {count}
              </OptionButton>
            ))}
          </div>
        </div>
      ) : null}

      {showShelfSettings ? (
        <div className="wp-interior-layout-settings">
          <span className="wp-interior-layout-label">סוג מדף</span>
          <div className="wp-interior-layout-options" role="group" aria-label="סוג מדף">
            {SHELF_VARIANT_OPTIONS.map(({ variant, label, icon }) => (
              <OptionButton
                key={variant}
                density="micro"
                selected={variant === activeShelfVariant}
                icon={<i className={icon} aria-hidden="true" />}
                testId={`interior-manual-shelf-variant-${variant}-button`}
                onClick={() => selectShelf(variant)}
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </div>
      ) : null}

      {isSketch && hasActiveTool && tool === 'shelf' ? (
        <InteriorSketchShelfDepthField {...props} formFieldIdScope="interior-layout-manual-controls" />
      ) : null}
      {isSketch && hasActiveTool && tool === 'storage' ? (
        <InteriorSketchStorageHeightField {...props} formFieldIdScope="interior-layout-manual-controls" />
      ) : null}
    </>
  );
}
