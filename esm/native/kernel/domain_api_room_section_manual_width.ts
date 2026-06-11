import type { ActionMetaLike } from '../../../types';

import { cfgBatch, setCfgManualWidth, setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { stripWidthOverridesFromConfig } from '../features/special_dims/index.js';
import type { InstallDomainApiRoomSectionArgs } from './domain_api_room_section_shared.js';

export function installRoomManualWidthSurface(args: InstallDomainApiRoomSectionArgs): void {
  const { App, select, roomActions, _cfg, _meta } = args;

  select.room.isManualWidth =
    select.room.isManualWidth ||
    function () {
      const cfg = _cfg();
      return !!(cfg && cfg.isManualWidth);
    };

  roomActions.setManualWidth =
    roomActions.setManualWidth ||
    function (isManual: unknown, meta: ActionMetaLike | undefined) {
      meta = _meta(meta, 'actions:room:setManualWidth');
      const next = !!isManual;

      if (!next) {
        const cfg0 = _cfg() || {};
        const mods0 = readModulesConfigurationListFromConfigSnapshot(cfg0, 'modulesConfiguration');
        const cleaned = mods0.map(m => stripWidthOverridesFromConfig(m));

        const sourceBase =
          (meta && meta.source ? String(meta.source) : 'actions:room:setManualWidth') + ':off:clean';
        const meta2 = Object.assign({ immediate: true }, meta || {}, { source: sourceBase });

        return cfgBatch(
          App,
          function () {
            setCfgManualWidth(App, false, meta2);
            setCfgModulesConfiguration(App, cleaned, meta2);
          },
          meta2
        );
      }

      return setCfgManualWidth(App, next, meta);
    };
}
