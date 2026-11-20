import { defineView, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import {
  ALL_VISITS_VIEW,
  WEBSITE_VISIT_FIELDS,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { column } from 'src/views/view-helpers';

// The sidebar opens this view: all visits, newest first, readable columns.
// Twenty's own "All Website Visits" view is server-owned and unsorted.
export default defineView({
  universalIdentifier: ALL_VISITS_VIEW.view,
  name: 'All visits',
  objectUniversalIdentifier: WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconWorldWww',
  type: ViewType.TABLE,
  position: 0,
  fields: [
    column(ALL_VISITS_VIEW.fieldVisitedAt, WEBSITE_VISIT_FIELDS.visitedAt, 0, 140),
    column(ALL_VISITS_VIEW.fieldCompany, WEBSITE_VISIT_FIELDS.company, 1, 170),
    column(ALL_VISITS_VIEW.fieldIntentTier, WEBSITE_VISIT_FIELDS.intentTier, 2, 90),
    column(ALL_VISITS_VIEW.fieldIntentScore, WEBSITE_VISIT_FIELDS.intentScore, 3, 100),
    column(ALL_VISITS_VIEW.fieldFormSubmitted, WEBSITE_VISIT_FIELDS.formSubmitted, 4, 130),
    column(ALL_VISITS_VIEW.fieldLandingPage, WEBSITE_VISIT_FIELDS.landingPage, 5, 200),
    column(ALL_VISITS_VIEW.fieldPages, WEBSITE_VISIT_FIELDS.pages, 6, 300),
    column(ALL_VISITS_VIEW.fieldDuration, WEBSITE_VISIT_FIELDS.durationSeconds, 7, 150),
    column(ALL_VISITS_VIEW.fieldPageDepth, WEBSITE_VISIT_FIELDS.pageDepth, 8, 100),
    column(ALL_VISITS_VIEW.fieldVisitLocation, WEBSITE_VISIT_FIELDS.visitLocation, 9, 150),
    column(ALL_VISITS_VIEW.fieldSource, WEBSITE_VISIT_FIELDS.source, 10, 110),
    column(ALL_VISITS_VIEW.fieldMedium, WEBSITE_VISIT_FIELDS.medium, 11, 110),
    column(ALL_VISITS_VIEW.fieldCampaign, WEBSITE_VISIT_FIELDS.campaign, 12, 140),
    column(ALL_VISITS_VIEW.fieldOpenOpportunity, WEBSITE_VISIT_FIELDS.hasOpenOpportunity, 13, 130),
    column(ALL_VISITS_VIEW.fieldLeadfeederLink, WEBSITE_VISIT_FIELDS.leadfeederLink, 14, 130),
  ],
  sorts: [
    {
      universalIdentifier: ALL_VISITS_VIEW.sortVisitedAt,
      fieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
      direction: ViewSortDirection.DESC,
    },
  ],
});
