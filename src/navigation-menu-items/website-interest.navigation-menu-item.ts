import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  WEBSITE_INTEREST_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  WEBSITE_INTEREST_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: WEBSITE_INTEREST_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  name: 'Website Interest',
  icon: 'IconChartLine',
  position: 101,
  pageLayoutUniversalIdentifier: WEBSITE_INTEREST_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
