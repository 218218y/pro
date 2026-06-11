import type { DragEvent, ReactElement, ReactNode } from 'react';

import { StructureTabSavedModelsList } from './structure_tab_saved_models_list.js';
import type { StructureTabSavedModelsViewProps } from './structure_tab_saved_models_view_contracts.js';
import { SAVED_MODELS_HEADER_TITLE_STYLE } from './structure_tab_saved_models_view_contracts.js';

function renderChevron(open: boolean): ReactElement {
  return (
    <i
      className="fas fa-chevron-down"
      style={{
        marginLeft: 'auto',
        transition: 'transform 0.15s ease',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        opacity: 0.9,
      }}
    />
  );
}

export type SavedModelsAccordionSectionProps = {
  title: string;
  iconClassName: string;
  iconColor: string;
  open: boolean;
  onToggle: () => void;
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  children?: ReactNode;
};

export function SavedModelsAccordionSection(props: SavedModelsAccordionSectionProps): ReactElement {
  return (
    <>
      <button
        type="button"
        className="wp-r-savedmodels-toggle"
        onClick={props.onToggle}
        aria-expanded={props.open}
        onDragEnter={props.onDragEnter}
        onDragOver={props.onDragOver}
        onDrop={props.onDrop}
      >
        <span className="section-title" style={SAVED_MODELS_HEADER_TITLE_STYLE}>
          <i className={props.iconClassName} style={{ color: props.iconColor }} />
          <span>{props.title}</span>
          {renderChevron(props.open)}
        </span>
      </button>
      {props.open ? props.children : null}
    </>
  );
}

export function SavedModelsPrimaryActions(
  props: Pick<StructureTabSavedModelsViewProps, 'saveCurrent' | 'deleteSelected' | 'moveSelected'>
): ReactElement {
  return (
    <div className="wp-r-savedmodels-grid">
      <button
        id="btnSaveModel"
        type="button"
        className="btn btn-save wp-r-savedmodels-btn"
        onClick={props.saveCurrent}
      >
        שמור דגם
      </button>

      <button
        id="btnDeleteModel"
        type="button"
        className="btn btn-delete wp-r-savedmodels-btn"
        onClick={props.deleteSelected}
      >
        מחק
      </button>

      <div className="wp-r-savedmodels-arrows">
        <button
          id="btnMoveModelUp"
          type="button"
          className="btn btn-accent wp-r-savedmodels-arrow"
          onClick={() => props.moveSelected('up')}
          title="הזז למעלה"
          aria-label="הזז דגם למעלה"
          aria-disabled={false}
        >
          <i className="fas fa-arrow-up" />
        </button>
        <button
          id="btnMoveModelDown"
          type="button"
          className="btn btn-accent wp-r-savedmodels-arrow"
          onClick={() => props.moveSelected('down')}
          title="הזז למטה"
          aria-label="הזז דגם למטה"
          aria-disabled={false}
        >
          <i className="fas fa-arrow-down" />
        </button>
      </div>
    </div>
  );
}

export function SavedModelsPresetSection(props: StructureTabSavedModelsViewProps): ReactElement {
  return (
    <SavedModelsAccordionSection
      title="דגמים מובנים"
      iconClassName="fas fa-cubes"
      iconColor="#0ea5e9"
      open={props.presetModelsOpen}
      onToggle={() => props.setPresetModelsOpen(open => !open)}
      onDragEnter={event => props.handleHeaderDragEnter('preset', event)}
      onDragOver={event => props.handleHeaderDragOver('preset', event)}
      onDrop={event => props.handleHeaderDrop('preset', event)}
    >
      <StructureTabSavedModelsList
        list={props.presetModels}
        listType="preset"
        emptyText="אין דגמים מובנים."
        selectedId={props.selectedId}
        draggingModelId={props.draggingModelId}
        dragOverModelId={props.dragOverModelId}
        dragOverPos={props.dragOverPos}
        onSetSelected={props.setSelected}
        onApplySelected={props.applySelected}
        onToggleLock={props.toggleLock}
        onOverwriteById={props.overwriteById}
        onDeleteById={props.deleteById}
        onListDragLeave={props.handleListDragLeave}
        onEmptyZoneDragOver={props.handleEmptyZoneDragOver}
        onEmptyZoneDragLeave={props.handleEmptyZoneDragLeave}
        onEmptyZoneDrop={props.handleEmptyZoneDrop}
        onRowDragStart={props.handleRowDragStart}
        onRowDragEnd={props.handleRowDragEnd}
        onRowDragOver={props.handleRowDragOver}
        onRowDrop={props.handleRowDrop}
        onEndDropZoneDragOver={props.handleEndDropZoneDragOver}
        onEndDropZoneDrop={props.handleEndDropZoneDrop}
      />
    </SavedModelsAccordionSection>
  );
}

export function SavedModelsUserSection(props: StructureTabSavedModelsViewProps): ReactElement {
  return (
    <SavedModelsAccordionSection
      title="דגמים שמורים"
      iconClassName="fas fa-folder-open"
      iconColor="#f59e0b"
      open={props.savedModelsOpen}
      onToggle={() => props.setSavedModelsOpen(open => !open)}
      onDragEnter={event => props.handleHeaderDragEnter('saved', event)}
      onDragOver={event => props.handleHeaderDragOver('saved', event)}
      onDrop={event => props.handleHeaderDrop('saved', event)}
    >
      <StructureTabSavedModelsList
        list={props.savedModels}
        listType="saved"
        emptyText="אין דגמים שמורים עדיין."
        selectedId={props.selectedId}
        draggingModelId={props.draggingModelId}
        dragOverModelId={props.dragOverModelId}
        dragOverPos={props.dragOverPos}
        onSetSelected={props.setSelected}
        onApplySelected={props.applySelected}
        onToggleLock={props.toggleLock}
        onOverwriteById={props.overwriteById}
        onDeleteById={props.deleteById}
        onListDragLeave={props.handleListDragLeave}
        onEmptyZoneDragOver={props.handleEmptyZoneDragOver}
        onEmptyZoneDragLeave={props.handleEmptyZoneDragLeave}
        onEmptyZoneDrop={props.handleEmptyZoneDrop}
        onRowDragStart={props.handleRowDragStart}
        onRowDragEnd={props.handleRowDragEnd}
        onRowDragOver={props.handleRowDragOver}
        onRowDrop={props.handleRowDrop}
        onEndDropZoneDragOver={props.handleEndDropZoneDragOver}
        onEndDropZoneDrop={props.handleEndDropZoneDrop}
      />
    </SavedModelsAccordionSection>
  );
}
