import {
  defineView,
  ViewFilterGroupLogicalOperator,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  OPEN_DEAL_VISITS_VIEW,
  WEBSITE_VISIT_FIELDS,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { column, withinLastDaysFilters } from 'src/views/view-helpers';

// Visits in the last 30 days from companies with an open opportunity at the
// time of the visit: buying signals on running deals.
export default defineView({
  universalIdentifier: OPEN_DEAL_VISITS_VIEW.view,
  name: 'Open deals (30 days)',
  objectUniversalIdentifier: WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconTargetArrow',
  type: ViewType.TABLE,
  position: 2,
  fields: [
    column(OPEN_DEAL_VISITS_VIEW.fieldCompany, WEBSITE_VISIT_FIELDS.company, 0, 170),
    column(OPEN_DEAL_VISITS_VIEW.fieldVisitedAt, WEBSITE_VISIT_FIELDS.visitedAt, 1, 140),
    column(OPEN_DEAL_VISITS_VIEW.fieldIntentTier, WEBSITE_VISIT_FIELDS.intentTier, 2, 90),
    column(OPEN_DEAL_VISITS_VIEW.fieldLandingPage, WEBSITE_VISIT_FIELDS.landingPage, 3, 200),
    column(OPEN_DEAL_VISITS_VIEW.fieldPages, WEBSITE_VISIT_FIELDS.pages, 4, 300),
  ],
  filterGroups: [
    {
      universalIdentifier: OPEN_DEAL_VISITS_VIEW.rootFilterGroup,
      logicalOperator: ViewFilterGroupLogicalOperator.AND,
    },
    {
      universalIdentifier: OPEN_DEAL_VISITS_VIEW.windowFilterGroup,
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
      parentViewFilterGroupUniversalIdentifier: OPEN_DEAL_VISITS_VIEW.rootFilterGroup,
      positionInViewFilterGroup: 1,
    },
  ],
  filters: [
    {
      universalIdentifier: OPEN_DEAL_VISITS_VIEW.filterOpenOpportunity,
      fieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.hasOpenOpportunity,
      operand: ViewFilterOperand.IS,
      value: 'true',
      viewFilterGroupUniversalIdentifier: OPEN_DEAL_VISITS_VIEW.rootFilterGroup,
      positionInViewFilterGroup: 0,
    },
    ...withinLastDaysFilters({
      days: 30,
      dateFieldUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
      groupUniversalIdentifier: OPEN_DEAL_VISITS_VIEW.windowFilterGroup,
      pastFilterUniversalIdentifier: OPEN_DEAL_VISITS_VIEW.filterPastDays,
      todayFilterUniversalIdentifier: OPEN_DEAL_VISITS_VIEW.filterToday,
    }),
  ],
  sorts: [
    {
      universalIdentifier: OPEN_DEAL_VISITS_VIEW.sortVisitedAt,
      fieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
