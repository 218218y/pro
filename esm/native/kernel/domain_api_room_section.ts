import type { InstallDomainApiRoomSectionArgs } from './domain_api_room_section_shared.js';

import { patchUiSoft } from '../runtime/ui_write_access.js';
import { installRoomManualWidthSurface } from './domain_api_room_section_manual_width.js';
import { installRoomWardrobeTypeSurface } from './domain_api_room_section_wardrobe.js';

export type {
  DomainApiRoomSelectRoot,
  InstallDomainApiRoomSectionArgs,
  RoomSelectSurface,
} from './domain_api_room_section_shared.js';

export function installDomainApiRoomSection(args: InstallDomainApiRoomSectionArgs): void {
  const { App, select, roomActions, _ui, _meta } = args;

  select.room.floorType =
    select.room.floorType ||
    function () {
      const ui = _ui();
      if (ui && typeof ui.currentFloorType !== 'undefined') return ui.currentFloorType || 'parquet';
      return 'parquet';
    };

  roomActions.setFloorType =
    roomActions.setFloorType ||
    function (t: unknown, meta) {
      meta = _meta(meta, 'actions:room:setFloorType');
      const next = t === 'tiles' ? 'tiles' : t === 'none' ? 'none' : 'parquet';
      return patchUiSoft(App, { currentFloorType: next }, meta);
    };

  installRoomWardrobeTypeSurface(args);
  installRoomManualWidthSurface(args);
}
