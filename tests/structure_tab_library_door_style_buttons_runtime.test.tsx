import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StructureDimensionsMainFields } from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_main.js';
import { OptionButton } from '../esm/native/ui/react/components/index.js';
import {
  STRUCTURE_LIBRARY_DOOR_STYLE_BUTTON_GROUP_TEST_ID,
  STRUCTURE_LIBRARY_GLASS_BUTTON_GROUP_TEST_ID,
} from '../esm/native/ui/react/tabs/structure_tab_dimensions_section_contracts.js';

const noop = () => undefined;
const baseProps = {
  isSliding: false,
  doors: 3,
  width: 120,
  height: 240,
  depth: 60,
  isManualWidth: false,
  isLibraryMode: true,
  libraryUpperDoorsHidden: false,
  onSetRaw: noop,
  onResetAutoWidth: noop,
  onToggleLibraryUpperDoors: noop,
  onPickLibraryGlass: noop,
  onPickLibraryDoorStyle: noop,
};

function collectElements(node: unknown): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(collectElements);
  if (!React.isValidElement(node)) return [];
  const item = node as React.ReactElement<{ children?: React.ReactNode }>;
  return [item, ...collectElements(item.props.children)];
}

test('library view places three per-door style controls directly below the three glass controls', () => {
  const html = renderToStaticMarkup(React.createElement(StructureDimensionsMainFields, baseProps));
  const glass = html.indexOf(`data-testid="${STRUCTURE_LIBRARY_GLASS_BUTTON_GROUP_TEST_ID}"`);
  const doorStyles = html.indexOf(`data-testid="${STRUCTURE_LIBRARY_DOOR_STYLE_BUTTON_GROUP_TEST_ID}"`);
  assert.ok(glass >= 0 && doorStyles > glass);
  assert.match(html, /data-door-style="flat"/);
  assert.match(html, /data-door-style="profile"/);
  assert.match(html, /data-door-style="double_profile"/);
  assert.equal((html.match(/data-door-style=/g) || []).length, 3);
  assert.equal((html.match(/data-glass-style=/g) || []).length, 3);

  const ordinary = renderToStaticMarkup(
    React.createElement(StructureDimensionsMainFields, { ...baseProps, isLibraryMode: false })
  );
  assert.doesNotMatch(ordinary, /structure-library-door-style-buttons/);
  assert.doesNotMatch(ordinary, /structure-library-glass-buttons/);
});

test('each library door-style button dispatches only its own requested per-part paint selection', () => {
  const calls: string[] = [];
  const tree = StructureDimensionsMainFields({
    ...baseProps,
    onPickLibraryDoorStyle: style => calls.push(style),
  });
  const buttons = collectElements(tree).filter(
    element => element.type === OptionButton && element.props['data-door-style'] !== undefined
  );
  assert.deepEqual(
    buttons.map(button => button.props['data-door-style']),
    ['flat', 'profile', 'double_profile']
  );
  for (const button of buttons) button.props.onClick();
  assert.deepEqual(calls, ['flat', 'profile', 'double_profile']);
});
