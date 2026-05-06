import type { CSSProperties, ReactElement } from 'react';

import {
  getModelId,
  getModelName,
  isLockedModel,
  isPresetModel,
} from './structure_tab_saved_models_shared.js';
import type {
  SavedModelsListRowModel,
  StructureTabSavedModelsListProps,
} from './structure_tab_saved_models_list_contracts.js';

function getRowStyle(
  listType: StructureTabSavedModelsListProps['listType'],
  selected: boolean
): CSSProperties {
  if (listType === 'preset') {
    return {
      display: 'flex',
      alignItems: 'center',
      padding: '6px 8px',
      borderBottom: '1px solid #f1f5f9',
      background: selected ? '#f0f9ff' : 'transparent',
      direction: 'rtl',
    };
  }

  return {
    display: 'grid',
    gridTemplateColumns: '1fr 152px',
    alignItems: 'center',
    columnGap: 8,
    padding: '6px 8px',
    borderBottom: '1px solid #f1f5f9',
    background: selected ? '#f0f9ff' : 'transparent',
    direction: 'rtl',
  };
}

function getRowClassName(
  row: SavedModelsListRowModel,
  selectedId: string,
  dragOverPos: StructureTabSavedModelsListProps['dragOverPos']
): string {
  const base =
    row.id === selectedId ? 'wp-r-savedmodels-row wp-r-savedmodels-row--active' : 'wp-r-savedmodels-row';
  let extra = '';
  if (row.canDrag) extra += ' wp-r-savedmodels-row--draggable';
  if (row.isDragging) extra += ' wp-r-savedmodels-row--dragging';
  if (row.isOver && dragOverPos === 'before') extra += ' wp-r-savedmodels-row--dropbefore';
  if (row.isOver && dragOverPos === 'after') extra += ' wp-r-savedmodels-row--dropafter';
  return base + extra;
}

export function buildSavedModelsListRowModel(
  model: StructureTabSavedModelsListProps['list'][number],
  props: Pick<StructureTabSavedModelsListProps, 'listType' | 'draggingModelId' | 'dragOverModelId'>
): SavedModelsListRowModel {
  const id = getModelId(model);
  const name = getModelName(model, id) || id;
  const preset = isPresetModel(model);
  const locked = isLockedModel(model);
  const canDrag = props.listType === 'preset' ? preset : !preset && !locked;
  const canOverwrite = preset || !locked;
  return {
    id,
    name,
    preset,
    locked,
    canDrag,
    canOverwrite,
    isDragging: !!props.draggingModelId && props.draggingModelId === id,
    isOver: !!props.dragOverModelId && props.dragOverModelId === id,
  };
}

function SavedModelsRowActions(
  props: Pick<
    StructureTabSavedModelsListProps,
    'onSetSelected' | 'onToggleLock' | 'onOverwriteById' | 'onDeleteById'
  > & {
    key?: string | number;
    row: SavedModelsListRowModel;
  }
): ReactElement | null {
  if (props.row.preset) return null;

  return (
    <div className="wp-r-savedmodels-rowactions" dir="ltr">
      <button
        type="button"
        className={
          props.row.locked
            ? 'btn btn-accent btn-inline btn-sm wp-r-savedmodels-rowicon'
            : 'btn btn-inline btn-sm wp-r-savedmodels-rowicon'
        }
        onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          props.onSetSelected(props.row.id);
          props.onToggleLock(props.row.id);
        }}
        title={props.row.locked ? 'הדגם נעול (לחץ לשחרר)' : 'נעל דגם (מונע מחיקה ושינוי סדר)'}
        aria-label="נעילת דגם"
        disabled={props.row.preset}
        aria-disabled={props.row.preset}
      >
        <i className={props.row.locked ? 'fas fa-lock' : 'fas fa-unlock'} />
      </button>

      <button
        type="button"
        className="btn btn-accent btn-inline btn-sm wp-r-savedmodels-rowicon"
        onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          props.onSetSelected(props.row.id);
          props.onOverwriteById(props.row.id);
        }}
        title={!props.row.canOverwrite ? 'הדגם נעול - בטל נעילה כדי לעדכן' : 'עדכן/דרוס דגם לפי המצב הנוכחי'}
        aria-label="עדכון דגם"
        disabled={!props.row.canOverwrite}
        aria-disabled={!props.row.canOverwrite}
      >
        <i className="fas fa-sync-alt" />
      </button>

      <button
        type="button"
        className="btn btn-danger btn-inline btn-sm wp-r-savedmodels-rowicon"
        onClick={(event: import('react').MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          props.onSetSelected(props.row.id);
          props.onDeleteById(props.row.id);
        }}
        title={props.row.preset ? 'לא ניתן למחוק דגם מובנה' : 'מחק דגם'}
        aria-label="מחק דגם"
        disabled={props.row.preset}
        aria-disabled={props.row.preset}
      >
        <i className="fas fa-trash" />
      </button>
    </div>
  );
}

export function StructureTabSavedModelsListRow(
  props: Pick<
    StructureTabSavedModelsListProps,
    | 'listType'
    | 'selectedId'
    | 'dragOverPos'
    | 'onSetSelected'
    | 'onApplySelected'
    | 'onToggleLock'
    | 'onOverwriteById'
    | 'onDeleteById'
    | 'onRowDragStart'
    | 'onRowDragEnd'
    | 'onRowDragOver'
    | 'onRowDrop'
  > & { key?: string | number; row: SavedModelsListRowModel }
): ReactElement {
  return (
    <div
      key={props.row.id}
      className={getRowClassName(props.row, props.selectedId, props.dragOverPos)}
      draggable={props.row.canDrag}
      onDragStart={(event: import('react').DragEvent<HTMLDivElement>) => {
        if (!props.row.canDrag) return;
        props.onRowDragStart(props.row.id, props.listType, event);
      }}
      onDragEnd={props.onRowDragEnd}
      onDragOver={(event: import('react').DragEvent<HTMLDivElement>) =>
        props.onRowDragOver(props.row.id, event)
      }
      onDrop={(event: import('react').DragEvent<HTMLDivElement>) =>
        props.onRowDrop(props.row.id, props.listType, event)
      }
      style={getRowStyle(props.listType, props.row.id === props.selectedId)}
    >
      <button
        type="button"
        className="btn btn-inline btn-sm"
        style={
          props.listType === 'preset'
            ? {
                width: '100%',
                textAlign: 'right',
                justifyContent: 'flex-start',
                direction: 'rtl',
              }
            : { textAlign: 'right', justifyContent: 'flex-start', direction: 'rtl' }
        }
        onClick={() => {
          props.onSetSelected(props.row.id);
          if (props.row.id) props.onApplySelected(props.row.id);
        }}
        title={props.row.name}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>{props.row.name}</span>
        </span>
      </button>

      <SavedModelsRowActions
        row={props.row}
        onSetSelected={props.onSetSelected}
        onToggleLock={props.onToggleLock}
        onOverwriteById={props.onOverwriteById}
        onDeleteById={props.onDeleteById}
      />
    </div>
  );
}
