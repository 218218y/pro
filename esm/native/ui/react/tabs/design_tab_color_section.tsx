import type { DragEvent, MouseEvent, ReactElement } from 'react';

import { ColorSwatchItem } from '../components/index.js';
import { MultiColorPanel, __designTabReportNonFatal } from './design_tab_multicolor_panel.js';
import type { DesignTabColorSectionModel } from './use_design_tab_controller_contracts.js';

export function DesignTabColorSection(props: { model: DesignTabColorSectionModel }): ReactElement {
  const model = props.model;

  return (
    <div className="control-section" data-testid="design-color-section" data-draft-color={model.draftColor}>
      <span className="section-title">צבע ותוספות</span>

      <div className="wp-r-label">צבע חזית ראשי</div>

      <div
        className={
          model.canReorderColorSwatches ? 'color-picker-row wp-savedcolors-reorderable' : 'color-picker-row'
        }
        onDragLeave={model.onSwatchRowDragLeave}
        data-testid="design-color-swatch-row"
      >
        {model.orderedSwatches.map(color => {
          const choice = String(model.colorChoice || '');
          const id = model.readSavedColorId(color);
          const isSaved = id.indexOf('saved_') === 0;
          const isSelected =
            choice === id ||
            (!!choice &&
              choice[0] === '#' &&
              model.readSavedColorValue(color).toLowerCase() === choice.toLowerCase());

          const style = model.getSwatchStyle(color);
          const isDragging = !!model.draggingColorId && model.draggingColorId === id;
          const isOver = !!model.dragOverColorId && model.dragOverColorId === id;

          let dndExtra = '';
          if (model.canReorderColorSwatches) {
            dndExtra = ' is-draggable';
            if (isDragging) dndExtra += ' is-dragging';
            if (isOver && model.dragOverColorPos === 'before') dndExtra += ' is-dropbefore';
            if (isOver && model.dragOverColorPos === 'after') dndExtra += ' is-dropafter';
          }

          return (
            <ColorSwatchItem
              key={id}
              className={dndExtra}
              title={
                model.readSavedColorName(color) + (model.canReorderColorSwatches ? ' (גרור לשינוי סדר)' : '')
              }
              onPick={() => model.onPickSwatch(color)}
              saved={isSaved}
              selected={isSelected}
              draggable={model.canReorderColorSwatches}
              swatchStyle={style}
              onDragStart={(event: DragEvent<HTMLDivElement>) => model.onSwatchDragStart(id, event)}
              onDragEnd={model.onSwatchDragEnd}
              onDragOver={(event: DragEvent<HTMLDivElement>) => model.onSwatchDragOver(id, event)}
              onDrop={(event: DragEvent<HTMLDivElement>) => model.onSwatchDrop(id, event)}
              data-testid="design-color-swatch-item"
              data-color-id={id}
              data-color-kind={isSaved ? 'saved' : 'default'}
              data-color-value={String(model.readSavedColorValue(color) || '').toLowerCase()}
              data-selected={isSelected ? 'true' : 'false'}
            >
              {isSaved ? (
                <button
                  type="button"
                  draggable={false}
                  data-testid="design-color-swatch-lock-button"
                  onDragStart={(event: DragEvent<HTMLButtonElement>) => {
                    try {
                      event.preventDefault();
                      event.stopPropagation();
                    } catch (err) {
                      __designTabReportNonFatal('colorSection:lockDragStart', err);
                    }
                  }}
                  className={
                    'swatch-lock' + (model.isSavedColorLocked(color) ? ' is-locked' : ' is-unlocked')
                  }
                  aria-label={
                    model.isSavedColorLocked(color) ? 'צבע נעול (לחץ לשחרר)' : 'צבע לא נעול (לחץ לנעילה)'
                  }
                  title={
                    model.isSavedColorLocked(color) ? 'צבע נעול (לחץ לשחרר)' : 'צבע לא נעול (לחץ לנעילה)'
                  }
                  aria-pressed={!!model.isSavedColorLocked(color)}
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    try {
                      event.preventDefault();
                      event.stopPropagation();
                    } catch (err) {
                      __designTabReportNonFatal('colorSection:lockClick', err);
                    }
                    model.toggleColorLockById(id);
                  }}
                >
                  <i className={model.isSavedColorLocked(color) ? 'fas fa-lock' : 'fas fa-unlock'} />
                </button>
              ) : null}
            </ColorSwatchItem>
          );
        })}

        <div
          className={
            model.canReorderColorSwatches && model.draggingColorId && model.dragOverColorId === '__end__'
              ? 'wp-savedcolors-dropend wp-savedcolors-dropend--active'
              : 'wp-savedcolors-dropend'
          }
          onDragOver={model.onSwatchEndDragOver}
          onDrop={model.onSwatchEndDrop}
          aria-hidden="true"
        />
      </div>

      {model.selectedCustom ? (
        <div className="wp-r-btn-row wp-r-split-between" style={{ marginTop: 10 }}>
          <button
            type="button"
            className="btn btn-delete wp-r-btn-compact"
            onClick={model.deleteSelectedColor}
            data-testid="design-selected-color-delete-button"
          >
            <i className="fas fa-trash-alt"></i> מחק גוון זה
          </button>

          <button
            type="button"
            className="btn btn-inline wp-r-btn-compact"
            onClick={model.toggleSelectedColorLock}
            data-testid="design-selected-color-lock-button"
          >
            <i className={model.selectedCustom.locked ? 'fas fa-lock' : 'fas fa-unlock'}></i>{' '}
            {model.selectedCustom.locked ? 'שחרר נעילת צבע' : 'נעילת צבע'}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={'btn-add-color' + (model.customOpen ? ' is-open' : '')}
        onClick={model.togglePanelOpen}
        aria-expanded={model.customOpen}
        data-testid="design-custom-color-toggle"
      >
        <span className="wp-r-btn-add-label">יצירת גוון חדש</span>
        <i
          className={'fas ' + (model.customOpen ? 'fa-chevron-up' : 'fa-chevron-down') + ' wp-chevron'}
          aria-hidden="true"
        />
      </button>

      {model.customOpen ? (
        <div className="wp-r-custom-color">
          <div className="wp-r-custom-picker-grid">
            <div className="wp-r-custom-picker-col wp-r-custom-picker-col-palette">
              <div className="wp-r-custom-picker-title">בחר צבע מהפלטה</div>

              <div className="wp-r-color-row">
                <input
                  type="color"
                  value={model.draftColor}
                  onChange={model.onPickCustomColor}
                  className="wp-r-color-input"
                  name="customColor"
                  aria-label="בחר צבע מהפלטה"
                  data-testid="design-custom-color-input"
                />
              </div>
            </div>

            <div className="wp-r-custom-picker-col wp-r-custom-picker-col-texture">
              <div className="wp-r-custom-picker-title">העלה טקסטורה</div>

              <div className="wp-r-upload-controls">
                <input
                  ref={model.fileRef}
                  id="wp-r-texture-upload"
                  type="file"
                  accept="image/*"
                  onChange={model.onPickTextureFile}
                  className="wp-r-file-hidden"
                />

                <label
                  htmlFor="wp-r-texture-upload"
                  className="wp-r-file-btn"
                  role="button"
                  data-testid="design-custom-texture-upload-button"
                >
                  <i className="fas fa-upload" />
                  <span>בחירת קובץ</span>
                </label>

                <div className="wp-r-file-name">
                  {model.draftTextureName
                    ? model.draftTextureName
                    : model.draftTextureData
                      ? 'נבחר קובץ'
                      : 'לא נבחר קובץ'}
                </div>
              </div>
            </div>
          </div>

          {model.draftTextureData ? (
            <div className="wp-r-upload-ok">
              <i className="fas fa-check"></i> תמונה נטענה!
              {model.draftTextureName ? <span className="wp-r-ml-1">({model.draftTextureName})</span> : null}
            </div>
          ) : null}

          {model.draftTextureData ? (
            <button
              type="button"
              className="btn btn-delete wp-r-btn-xs wp-r-mt-1"
              onClick={model.removeTexture}
            >
              הסר תמונה
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-save wp-r-mt-4"
            onClick={model.saveCustom}
            data-testid="design-custom-color-save-button"
          >
            שמור גוון לרשימה
          </button>

          <button
            type="button"
            className="btn btn-accent wp-r-mt-1"
            onClick={model.cancelCustom}
            data-testid="design-custom-color-cancel-button"
          >
            ביטול
          </button>
        </div>
      ) : null}

      <div className="wp-r-mt-4">
        <MultiColorPanel embedded />
      </div>
    </div>
  );
}
