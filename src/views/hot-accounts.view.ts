import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterGroupLogicalOperator,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  COMPANY_FIELDS,
  HOT_ACCOUNTS_VIEW,
} from 'src/constants/universal-identifiers';
import { column, withinLastDaysFilters } from 'src/views/view-helpers';

const COMPANY = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company;

// Companies that visited the website in the last 14 days, highest intent
// first. One sort only: Twenty gives several view sorts no fixed priority.
export default defineView({
  universalIdentifier: HOT_ACCOUNTS_VIEW.view,
  name: 'Website visitors (14 days)',
  objectUniversalIdentifier: COMPANY.universalIdentifier,
  icon: 'IconFlame',
  type: ViewType.TABLE,
  position: 100,
  fields: [
    column(HOT_ACCOUNTS_VIEW.fieldName, COMPANY.fields.name.universalIdentifier, 0, 200),
    column(HOT_ACCOUNTS_VIEW.fieldIntentTier, COMPANY_FIELDS.leadfeederIntentTier, 1, 100),
    column(HOT_ACCOUNTS_VIEW.fieldIntentScore, COMPANY_FIELDS.leadfeederIntentScore, 2, 100),
    column(HOT_ACCOUNTS_VIEW.fieldLastVisit, COMPANY_FIELDS.lastWebsiteVisit, 3, 150),
    column(HOT_ACCOUNTS_VIEW.fieldAccountOwner, COMPANY.fields.accountOwner.universalIdentifier, 4, 150),
    column(HOT_ACCOUNTS_VIEW.fieldOpportunities, COMPANY.fields.opportunities.universalIdentifier, 5, 200),
  ],
  filterGroups: [
    {
      universalIdentifier: HOT_ACCOUNTS_VIEW.filterGroup,
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
    },
  ],
  filters: withinLastDaysFilters({
    days: 14,
    dateFieldUniversalIdentifier: COMPANY_FIELDS.lastWebsiteVisit,
    groupUniversalIdentifier: HOT_ACCOUNTS_VIEW.filterGroup,
    pastFilterUniversalIdentifier: HOT_ACCOUNTS_VIEW.filterPastDays,
    todayFilterUniversalIdentifier: HOT_ACCOUNTS_VIEW.filterToday,
  }),
  sorts: [
    {
      universalIdentifier: HOT_ACCOUNTS_VIEW.sortIntent,
      fieldMetadataUniversalIdentifier: COMPANY_FIELDS.leadfeederIntentScore,
      direction: ViewSortDirection.DESC,
    },
  ],
});
