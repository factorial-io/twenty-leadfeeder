import {
  AggregateOperations,
  definePageLayout,
  getFieldUniversalIdentifier,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CASE_STUDY_PATH_PREFIX,
  COMPANY_FIELDS,
  HOT_ACCOUNTS_VIEW,
  OPEN_DEAL_VISITS_VIEW,
  RECENT_VISITS_VIEW,
  REVIEW_TASKS_VIEW,
  WEBSITE_INTEREST_FILTER_GROUPS,
  WEBSITE_INTEREST_INSIGHTS_TAB_UNIVERSAL_IDENTIFIER,
  WEBSITE_INTEREST_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  WEBSITE_INTEREST_TAB_UNIVERSAL_IDENTIFIER,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  WEBSITE_INTEREST_WIDGETS,
  WEBSITE_VISIT_FIELDS,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { REVIEW_TASK_TITLE_PREFIX } from 'src/constants/review-task';

const COMPANY = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company;
const TASK = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task;
const VISIT = WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER;

const grid = (
  row: number,
  column: number,
  rowSpan: number,
  columnSpan: number,
) => ({
  layoutMode: PageLayoutTabLayoutMode.GRID as const,
  row,
  column,
  rowSpan,
  columnSpan,
});

type RecordFilter = {
  fieldMetadataUniversalIdentifier: string;
  operand: string;
  value: string | null;
};

const filter = (
  fieldMetadataUniversalIdentifier: string,
  operand: string,
  value: string | null = null,
): RecordFilter => ({ fieldMetadataUniversalIdentifier, operand, value });

// Twenty's PAST_n_UNIT window ends where the current unit starts, so "last n"
// is PAST_(n-1)_UNIT or THIS_1_UNIT, combined in an OR group.
const withinLast = ({
  groupIds: [rootGroupId, windowGroupId],
  dateFieldUniversalIdentifier,
  amount,
  unit,
  filters = [],
}: {
  groupIds: readonly [string, string];
  dateFieldUniversalIdentifier: string;
  amount: number;
  unit: 'DAY' | 'WEEK';
  filters?: RecordFilter[];
}) => ({
  recordFilterGroups: [
    { id: rootGroupId, logicalOperator: 'AND' },
    {
      id: windowGroupId,
      logicalOperator: 'OR',
      parentRecordFilterGroupId: rootGroupId,
      positionInRecordFilterGroup: filters.length,
    },
  ],
  recordFilters: [
    ...filters.map((recordFilter, index) => ({
      ...recordFilter,
      recordFilterGroupId: rootGroupId,
      positionInRecordFilterGroup: index,
    })),
    {
      ...filter(dateFieldUniversalIdentifier, 'IS_RELATIVE', `PAST_${amount - 1}_${unit}`),
      recordFilterGroupId: windowGroupId,
      positionInRecordFilterGroup: 0,
    },
    {
      ...filter(dateFieldUniversalIdentifier, 'IS_RELATIVE', `THIS_1_${unit}`),
      recordFilterGroupId: windowGroupId,
      positionInRecordFilterGroup: 1,
    },
  ],
});

const visitsWithinLast = (
  groupIds: readonly [string, string],
  days: number,
  filters: RecordFilter[] = [],
) =>
  withinLast({
    groupIds,
    dateFieldUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
    amount: days,
    unit: 'DAY',
    filters,
  });

const companiesVisitedWithinLast = (
  groupIds: readonly [string, string],
  days: number,
  filters: RecordFilter[] = [],
) =>
  withinLast({
    groupIds,
    dateFieldUniversalIdentifier: COMPANY_FIELDS.lastWebsiteVisit,
    amount: days,
    unit: 'DAY',
    filters,
  });

const countVisits = {
  aggregateFieldMetadataUniversalIdentifier: getFieldUniversalIdentifier({
    applicationUniversalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
    objectUniversalIdentifier: WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
    name: 'id',
  }),
  aggregateOperation: AggregateOperations.COUNT,
};

const countCompanies = {
  aggregateFieldMetadataUniversalIdentifier: COMPANY.fields.id.universalIdentifier,
  aggregateOperation: AggregateOperations.COUNT,
};

// Horizontal bar charts draw the first category at the bottom, so an
// ascending order puts the biggest value on top.
const ranking = {
  primaryAxisOrderBy: 'VALUE_ASC',
  layout: 'HORIZONTAL',
  displayDataLabel: true,
};

const table = (viewUniversalIdentifier: string, recordLimit: number) => ({
  configurationType: 'RECORD_TABLE' as const,
  viewUniversalIdentifier,
  recordLimit,
  isUIEditable: false,
});

const keyFigure = (
  universalIdentifier: string,
  title: string,
  objectUniversalIdentifier: string,
  column: number,
  configuration: {
    aggregateFieldMetadataUniversalIdentifier: string;
    aggregateOperation: AggregateOperations;
    filter: ReturnType<typeof withinLast> | { recordFilters: RecordFilter[] };
  },
) => ({
  universalIdentifier,
  title,
  type: 'GRAPH' as const,
  objectUniversalIdentifier,
  position: grid(0, column, 3, 3),
  configuration: { configurationType: 'AGGREGATE_CHART' as const, ...configuration },
});

// Tab 1 answers "who should I contact, and why?"; tab 2 holds the analysis.
export default definePageLayout({
  universalIdentifier: WEBSITE_INTEREST_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Website Interest',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: WEBSITE_INTEREST_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Act now',
      position: 0,
      icon: 'IconFlame',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        keyFigure(WEBSITE_INTEREST_WIDGETS.visitsThisWeek, 'Visits from known companies (7 days)', VISIT, 0, {
          ...countVisits,
          filter: visitsWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.visitsThisWeek, 7),
        }),
        keyFigure(WEBSITE_INTEREST_WIDGETS.formSubmissions, 'Form submissions from known companies (30 days)', VISIT, 3, {
          ...countVisits,
          filter: visitsWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.formSubmissions, 30, [
            filter(WEBSITE_VISIT_FIELDS.formSubmitted, 'IS', 'true'),
          ]),
        }),
        keyFigure(WEBSITE_INTEREST_WIDGETS.unownedHotAccounts, 'Visitors without an account owner (14 days)', COMPANY.universalIdentifier, 6, {
          ...countCompanies,
          filter: companiesVisitedWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.unownedHotAccounts, 14, [
            filter(COMPANY.fields.accountOwner.universalIdentifier, 'IS_EMPTY'),
          ]),
        }),
        keyFigure(WEBSITE_INTEREST_WIDGETS.openReviewTasks, 'Unknown visitors to review', TASK.universalIdentifier, 9, {
          aggregateFieldMetadataUniversalIdentifier: TASK.fields.id.universalIdentifier,
          aggregateOperation: AggregateOperations.COUNT,
          filter: {
            recordFilters: [
              filter(TASK.fields.title.universalIdentifier, 'CONTAINS', REVIEW_TASK_TITLE_PREFIX),
              filter(TASK.fields.status.universalIdentifier, 'IS_NOT', JSON.stringify(['DONE'])),
            ],
          },
        }),
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.hotAccounts,
          title: 'Hot accounts: visited in the last 14 days, highest intent first',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: COMPANY.universalIdentifier,
          position: grid(3, 0, 9, 7),
          configuration: table(HOT_ACCOUNTS_VIEW.view, 15),
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.openDealVisits,
          title: 'Open deals with recent visits (30 days)',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: VISIT,
          position: grid(3, 7, 9, 5),
          configuration: table(OPEN_DEAL_VISITS_VIEW.view, 15),
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.recentVisits,
          title: 'What they read: visits of the last 7 days, newest first',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: VISIT,
          position: grid(12, 0, 10, 12),
          configuration: table(RECENT_VISITS_VIEW.view, 25),
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.reviewTasks,
          title: 'Unknown high-intent visitors: assign or close',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier: TASK.universalIdentifier,
          position: grid(22, 0, 7, 12),
          configuration: table(REVIEW_TASKS_VIEW.view, 15),
        },
      ],
    },
    {
      universalIdentifier: WEBSITE_INTEREST_INSIGHTS_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Insights',
      position: 1,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.visitsPerWeek,
          title: 'Visits per week by intent tier (12 weeks)',
          type: 'GRAPH',
          objectUniversalIdentifier: VISIT,
          position: grid(0, 0, 8, 12),
          configuration: {
            configurationType: 'BAR_CHART',
            ...countVisits,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
            primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.WEEK,
            primaryAxisOrderBy: 'FIELD_ASC',
            secondaryAxisGroupByFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.intentTier,
            groupMode: 'STACKED',
            layout: 'VERTICAL',
            displayLegend: true,
            filter: withinLast({
              groupIds: WEBSITE_INTEREST_FILTER_GROUPS.visitsPerWeek,
              dateFieldUniversalIdentifier: WEBSITE_VISIT_FIELDS.visitedAt,
              amount: 12,
              unit: 'WEEK',
            }),
          },
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.mostActiveCompanies,
          title: 'Most active companies (visits, 30 days)',
          type: 'GRAPH',
          objectUniversalIdentifier: VISIT,
          position: grid(8, 0, 8, 6),
          configuration: {
            configurationType: 'BAR_CHART',
            ...countVisits,
            ...ranking,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.company,
            primaryAxisGroupBySubFieldName: 'name',
            filter: visitsWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.mostActiveCompanies, 30),
          },
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.visitsByAccountOwner,
          title: 'Visiting companies by account owner (30 days)',
          type: 'GRAPH',
          objectUniversalIdentifier: COMPANY.universalIdentifier,
          position: grid(8, 6, 8, 6),
          configuration: {
            configurationType: 'BAR_CHART',
            ...countCompanies,
            ...ranking,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              COMPANY.fields.accountOwner.universalIdentifier,
            primaryAxisGroupBySubFieldName: 'name.firstName',
            filter: companiesVisitedWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.visitsByAccountOwner, 30),
          },
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.topPages,
          title: 'Top landing pages (30 days)',
          type: 'GRAPH',
          objectUniversalIdentifier: VISIT,
          position: grid(16, 0, 8, 6),
          configuration: {
            configurationType: 'BAR_CHART',
            ...countVisits,
            ...ranking,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.landingPage,
            filter: visitsWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.topPages, 30),
          },
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.trafficSources,
          title: 'Where known visitors come from (30 days)',
          type: 'GRAPH',
          objectUniversalIdentifier: VISIT,
          position: grid(16, 6, 8, 6),
          configuration: {
            configurationType: 'PIE_CHART',
            ...countVisits,
            groupByFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.source,
            displayLegend: true,
            showCenterMetric: true,
            filter: visitsWithinLast(WEBSITE_INTEREST_FILTER_GROUPS.trafficSources, 30),
          },
        },
        {
          universalIdentifier: WEBSITE_INTEREST_WIDGETS.caseStudyPages,
          title: `Most visited case studies (${CASE_STUDY_PATH_PREFIX}, 90 days)`,
          type: 'GRAPH',
          objectUniversalIdentifier: VISIT,
          position: grid(24, 0, 7, 12),
          configuration: {
            configurationType: 'BAR_CHART',
            ...countVisits,
            ...ranking,
            primaryAxisGroupByFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.landingPage,
            filter: visitsWithinLast(
              WEBSITE_INTEREST_FILTER_GROUPS.caseStudyPages,
              90,
              [filter(WEBSITE_VISIT_FIELDS.landingPage, 'CONTAINS', CASE_STUDY_PATH_PREFIX)],
            ),
          },
        },
      ],
    },
  ],
});
