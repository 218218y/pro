import type { ReactElement } from 'react';

import { TabPanel } from '../components/index.js';
import {
  RenderDisplaySection,
  RenderLightingSection,
  RenderNotesSection,
  RenderRoomSection,
} from './render_tab_sections.js';
import { useRenderTabController } from './use_render_tab_controller.js';

type RenderTabViewProps = {
  active: boolean;
};

export function RenderTabView(props: RenderTabViewProps): ReactElement {
  return <RenderTabInner active={props.active} />;
}

function RenderTabInner(props: { active: boolean }): ReactElement {
  const controller = useRenderTabController();

  return (
    <TabPanel tabId="render" active={props.active}>
      <RenderNotesSection model={controller.notesSection} />
      <RenderDisplaySection model={controller.displaySection} />
      <RenderRoomSection model={controller.roomSection} />
      <RenderLightingSection model={controller.lightingSection} />
    </TabPanel>
  );
}
