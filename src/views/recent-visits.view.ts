import {
  defineView,
  ViewFilterGroupLogicalOperator,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  RECENT_VISITS_VIEW,
  WEBSITE_VISIT_FIELDS,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { column, withinLastDaysFilters } from 'src/views/view-helpers';

// What known companies read on the website in the last 7 days, newest first.
export default defineView({
  universalIdentifier: RECENT_VISITS_VIEW.view,
  name: 'Last 7 days',
  objectUniversalIdentifier: WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconClock',
  type: ViewType.TABLE,
  position: 1,
  fields: [
    column(RECENT_VISITS_VIEW.fieldVisitedAt, WEBSITE_VISIT_FIELDS.visitedAt, 0, 140),
    column(RECENT_VISITS_VIEW.fieldCompany, WEBSITE_VISIT_FIELDS.company, 1, 170),
    column(RECENT_VISITS_VIEW.fieldIntentTier, WEBSITE_VISIT_FIELDS.intentTier, 2, 90),
    column(RECENT_VISITS_VIEW.fieldLandingPage, WEBSITE_VISIT_FIELDS.landingPage, 3, 200),
    column(RECENT_VISITS_VIEW.fieldPages, WEBSITE_VISIT_FIELDS.pages, 4, 320),
    column(RECENT_VISITS_VIEW.fieldDuration, WEBSITE_VISIT_FIELDS.durationSeconds, 5, 150),
    column(RECENT_VISITS_VIEW.fieldVisitLocation, WEBSITE_VISIT_FIELDS.visitLocation, 6, 150),
    column(RECENT_VISITS_VIEW.fieldSource, WEBSITE_VISIT_FIELDS.source, 7, 110),
  ],
  filterGroups: [
    {
      universalIdentifier: RECENT_VISITS_VIEW.filterGroup,
      logicalOperator: ViewFilterGroupLogicalOperator.OR,
    },
  ],
  filters: withinLastDaysFilters({
    days: 7,
    dateFieldUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
    groupUniversalIdentifier: RECENT_VISITS_VIEW.filterGroup,
    pastFilterUniversalIdentifier: RECENT_VISITS_VIEW.filterPastDays,
    todayFilterUniversalIdentifier: RECENT_VISITS_VIEW.filterToday,
  }),
  sorts: [
    {
      universalIdentifier: RECENT_VISITS_VIEW.sortVisitedAt,
      fieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
