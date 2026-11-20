import {
  definePageLayoutWidget,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  COMPANY_FIELDS,
  COMPANY_WEBSITE_VISITS_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayoutWidget({
  universalIdentifier: COMPANY_WEBSITE_VISITS_WIDGET_UNIVERSAL_IDENTIFIER,
  pageLayoutTabUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.tabs.home
      .universalIdentifier,
  title: 'Website Visits',
  type: 'FIELD',
  position: {
    layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
    index: 1000,
    heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.FIT_CONTENT,
  },
  configuration: {
    configurationType: 'FIELD',
    fieldMetadataId: COMPANY_FIELDS.websiteVisits,
    fieldDisplayMode: 'TABLE',
    isUIEditable: false,
  },
});
