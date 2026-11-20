import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  ALL_VISITS_VIEW,
  WEBSITE_VISITS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: WEBSITE_VISITS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.VIEW,
  name: 'Website Visits',
  icon: 'IconWorldWww',
  position: 100,
  viewUniversalIdentifier: ALL_VISITS_VIEW.view,
});
