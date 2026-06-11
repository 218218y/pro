import test from 'node:test';
import assert from 'node:assert/strict';

import { installNotesService } from '../esm/native/ui/notes_service.ts';
import { ensureFeedbackService } from '../esm/native/ui/feedback_shared.ts';

test('installNotesService reuses canonical notes and uiNotes slots instead of replacing them', () => {
  let entered = 0;
  let exited = 0;
  const existingNotes: any = {
    runtime: { onEnterDrawMode: () => entered++, onExitDrawMode: () => exited++ },
  };
  const existingUiNotes: any = { stable: true };
  const App: any = {
    actions: {
      config: {
        setSavedNotes() {
          return true;
        },
      },
      meta: {
        noBuild(meta: any) {
          return meta;
        },
        noHistory(meta: any) {
          return meta;
        },
      },
    },
    services: {
      notes: existingNotes,
      uiNotes: existingUiNotes,
    },
  };

  const notes = installNotesService(App);

  assert.equal(notes, existingNotes);
  assert.equal(App.services.notes, existingNotes);
  assert.equal(App.services.uiNotes, existingUiNotes);
  assert.equal(typeof existingUiNotes.enterScreenDrawMode, 'function');
  assert.equal(typeof existingUiNotes.exitScreenDrawMode, 'function');

  existingUiNotes.enterScreenDrawMode();
  assert.equal(notes.draw?.isScreenDrawMode, true);
  existingUiNotes.exitScreenDrawMode();

  assert.equal(entered, 1);
  assert.equal(exited, 1);
  assert.equal(notes.draw?.isScreenDrawMode, false);
});

test('ensureFeedbackService reuses the canonical uiFeedback slot without replacing sibling slots', () => {
  const existingUiFeedback = { toast() {} };
  const services = { uiFeedback: existingUiFeedback, sibling: { alive: true } } as any;
  const App: any = { services };

  const ensured = ensureFeedbackService(App);

  assert.equal(ensured, existingUiFeedback);
  assert.equal(App.services, services);
  assert.equal(App.services.uiFeedback, existingUiFeedback);
  assert.deepEqual(App.services.sibling, { alive: true });
});
