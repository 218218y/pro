import type { ReactElement } from 'react';

import { TabPanel } from '../components/index.js';
import { DesignTabColorSection } from './design_tab_color_section.js';
import { CorniceSection, DoorFeaturesSection, DoorStyleSection } from './design_tab_sections.js';
import { useDesignTabController } from './use_design_tab_controller.js';

type DesignTabViewProps = {
  active: boolean;
};

export function DesignTabView(props: DesignTabViewProps): ReactElement {
  return <DesignTabInner active={props.active} />;
}

function DesignTabInner(props: { active: boolean }): ReactElement {
  const controller = useDesignTabController();

  return (
    <TabPanel tabId="design" active={props.active}>
      <div className="wp-r-tab">
        <DoorStyleSection model={controller.doorStyleSection} />
        <DesignTabColorSection model={controller.colorSection} />
        <DoorFeaturesSection model={controller.doorFeaturesSection} />
        <CorniceSection model={controller.corniceSection} />
      </div>
    </TabPanel>
  );
}
