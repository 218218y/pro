import type { ReactElement } from 'react';

import {
  SAVED_MODELS_LIST_STYLE,
  SAVED_MODELS_LIST_WRAP_STYLE,
} from './structure_tab_saved_models_list_contracts.js';
import type { StructureTabSavedModelsListProps } from './structure_tab_saved_models_list_contracts.js';
import {
  buildSavedModelsListRowModel,
  StructureTabSavedModelsListRow,
} from './structure_tab_saved_models_list_row.js';

export function StructureTabSavedModelsList(props: StructureTabSavedModelsListProps): ReactElement {
  return (
    <div className="wp-r-savedmodels-listwrap" style={SAVED_MODELS_LIST_WRAP_STYLE}>
      <div
        className="wp-r-savedmodels-list wp-r-savedmodels-list--reorderable"
        style={SAVED_MODELS_LIST_STYLE}
        onDragLeave={props.onListDragLeave}
      >
        {props.list.length === 0 ? (
          <div
            className={
              props.dragOverModelId === '__empty__'
                ? 'wp-r-savedmodels-emptydrop wp-r-savedmodels-emptydrop--active'
                : 'wp-r-savedmodels-emptydrop'
            }
            style={{ padding: 10 }}
            onDragOver={props.onEmptyZoneDragOver}
            onDragLeave={props.onEmptyZoneDragLeave}
            onDrop={(event: import('react').DragEvent<HTMLDivElement>) =>
              props.onEmptyZoneDrop(props.listType, event)
            }
          >
            <div style={{ fontSize: 13, opacity: 0.85 }}>{props.emptyText}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>שחרר כאן כדי להעביר</div>
          </div>
        ) : (
          <>
            {props.list.map(model => {
              const row = buildSavedModelsListRowModel(model, props);
              return <StructureTabSavedModelsListRow key={row.id} row={row} {...props} />;
            })}

            <div
              className={
                props.dragOverModelId === '__end__'
                  ? 'wp-r-savedmodels-dropend wp-r-savedmodels-dropend--active'
                  : 'wp-r-savedmodels-dropend'
              }
              onDragOver={props.onEndDropZoneDragOver}
              onDrop={(event: import('react').DragEvent<HTMLDivElement>) =>
                props.onEndDropZoneDrop(props.listType, event)
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
