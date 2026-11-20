// Path prefix of the case study pages on your website, used by the
// "Most visited case studies" chart. Adapt it to your site.
export const CASE_STUDY_PATH_PREFIX = '/projekte/';

export const APP_DISPLAY_NAME = 'Leadfeeder Website Visits';
export const APP_DESCRIPTION =
  'Syncs Leadfeeder website visits to Twenty companies';
export const APPLICATION_UNIVERSAL_IDENTIFIER =
  'c17716e5-42c8-4059-ab68-f3bf9e9f6ac9';
export const DEFAULT_ROLE_UNIVERSAL_IDENTIFIER =
  '7f53dbfe-e114-433a-8171-8548b1c5dfed';
export const HEALTH_CHECK_UNIVERSAL_IDENTIFIER =
  '4c7975b7-3d43-4fa3-910e-70133861002c';

export const LEADFEEDER_API_KEY_VARIABLE_UNIVERSAL_IDENTIFIER =
  '105bf82e-da41-4e9c-ada8-72246494a17f';
export const LEADFEEDER_ACCOUNT_ID_VARIABLE_UNIVERSAL_IDENTIFIER =
  '8f8cdc9c-722b-4c3c-8c63-fd61ce5352c5';
export const TASK_INTENT_THRESHOLD_VARIABLE_UNIVERSAL_IDENTIFIER =
  'b7df3bde-1365-43b3-8af1-3cf9a934532a';

export const EXCLUDED_LEADFEEDER_COMPANY_IDS_VARIABLE_UNIVERSAL_IDENTIFIER =
  '281d6a2c-7a9a-43b3-a843-ac71cf15fd77';
export const CLOSED_OPPORTUNITY_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER =
  '30b5a82a-f5b9-42bf-bb8e-9c266f24b1db';

// Same value as STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company, kept here so
// logic functions do not bundle twenty-sdk/define.
export const COMPANY_OBJECT_UNIVERSAL_IDENTIFIER =
  '20202020-b374-4779-a561-80086cb2e17f';

export const WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER =
  'accbe61f-3327-49a6-9b18-eddb5ec6f1ca';
export const WEBSITE_VISIT_FIELDS = {
  leadfeederVisitId: '3ab35d81-5e22-4cb9-a2e2-71f7b6134f58',
  company: 'e6f5cb91-a62e-4189-8b4f-7f1f08286a14',
  visitedAt: '7e89bd64-7203-4ec9-ae58-eb12abd73331',
  landingPage: 'bdfc56af-77a5-455b-90ff-c92d600f2a36',
  pages: '319fa8dc-f15a-47b6-aa23-115a907641af',
  pageDepth: 'fe771607-dfa4-4e23-a9f6-73a4e2ab05f8',
  durationSeconds: '4eebda63-1c41-404e-9567-7d833c6cebeb',
  source: 'a76f1364-f730-4781-92ed-0ccab2a0547f',
  medium: 'f9aac301-094c-4292-a78a-19b3a18bb4ad',
  campaign: 'f3976bf4-3825-43db-aad5-0ddbdcb6fd0a',
  referringUrl: 'd1a946f2-b89c-441d-99b3-de0a5573af20',
  intentScore: 'ddd7b2f9-0f19-4972-b7fe-ec6279be16dc',
  intentTier: 'a672875b-7e45-4410-a5aa-ed417dd180f8',
  leadfeederLink: 'bfa3c3f7-ac9a-497d-b582-521d5d42d8fd',
  hasOpenOpportunity: 'bf656e3b-d139-469d-a514-f6816f5c7b5f',
  formSubmitted: '6fdbefb4-f28f-4db4-8b60-7a42ec6c2533',
  visitLocation: 'c731ce38-4060-4984-8527-3dd5058b07ab',
} as const;
export const WEBSITE_VISIT_LEADFEEDER_ID_INDEX_UNIVERSAL_IDENTIFIER =
  'e0588dc2-33f7-4213-8be0-90e62a0daa41';
export const WEBSITE_VISIT_LEADFEEDER_ID_INDEX_FIELD_UNIVERSAL_IDENTIFIER =
  '075526b4-84f4-4d63-a723-6bd4822000f6';

export const COMPANY_FIELDS = {
  websiteVisits: '9eab47f3-b22d-40c9-bf4a-cd67d490b41f',
  leadfeederCompanyId: 'f9a2efd9-9da2-4f30-8b7e-8129788df776',
  leadfeederIntentScore: '1c1903e6-7a09-490b-b04d-f0a0fbcce199',
  leadfeederIntentTier: '135ae1bb-cf32-44b1-9048-351a2ace078b',
  lastWebsiteVisit: '0e00bbbb-9ed2-43e4-a94f-4a6566014641',
} as const;

export const WEBSITE_VISITED_TIMELINE_ACTIVITY_TYPE_UNIVERSAL_IDENTIFIER =
  '39168b30-1407-4651-a5ff-e297f0bb8a8c';
export const SYNC_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER =
  '3f8daee0-31f4-4daa-95fe-b812f6bbdd19';
export const COMPANY_WEBSITE_VISITS_WIDGET_UNIVERSAL_IDENTIFIER =
  '4a370dcd-7b53-4992-aa30-41c176f49464';
export const WEBSITE_VISITS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '97262deb-5701-46bd-bc3a-4fe081894602';

export const WEBSITE_INTEREST_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  'd6356719-cc9f-4221-80a6-677522bd952f';
export const WEBSITE_INTEREST_TAB_UNIVERSAL_IDENTIFIER =
  '35ee7976-2a63-44bd-b4aa-9060ec4b60a3';
export const WEBSITE_INTEREST_INSIGHTS_TAB_UNIVERSAL_IDENTIFIER =
  'be0c8412-3085-41cf-bc22-37ab5f1063b3';
export const WEBSITE_INTEREST_WIDGETS = {
  visitsThisWeek: '0cc0c727-924b-4934-81bc-32e26ce0e79d',
  unownedHotAccounts: '9440332e-a87d-4a89-8c4a-42a1bc4ef475',
  openReviewTasks: 'c299a1c7-d30c-49eb-8def-58dc60eb9a09',
  formSubmissions: '435cf0e4-97b4-46e0-a17e-8e8d2dca635d',
  hotAccounts: '08cb3aee-f8ff-4781-a040-6d7657978175',
  openDealVisits: '843f440d-235b-408f-adc3-d4a99e1f0586',
  recentVisits: 'b193c213-069b-4ba2-b224-333701ba009a',
  reviewTasks: '140f2912-f583-4fb9-8e46-ec58c877656a',
  visitsPerWeek: '60b131ba-cda4-4cec-8b21-f7add68c8b13',
  mostActiveCompanies: '8d007fb1-e977-499e-9894-b15042392055',
  visitsByAccountOwner: '58373068-ce1a-4170-ba0b-548ae27b24e9',
  topPages: 'b8675316-aae9-4f6c-b621-1b5637bb87a9',
  trafficSources: '88943691-1645-4809-8c7e-2131ba25f636',
  caseStudyPages: 'a6ad240e-0b7c-45e7-9213-2fcc615a2555',
} as const;
export const WEBSITE_INTEREST_FILTER_GROUPS = {
  visitsThisWeek: ['2f844d71-4e55-482c-bd2d-56efd18aa3f3', '84aac901-6c22-4eae-9fb8-6ccc67bd83da'],
  unownedHotAccounts: ['f9f33a2c-f0b0-46db-8816-1b7de43861bb', 'e0ec64e2-c9a2-4565-a2f6-91d04144f880'],
  formSubmissions: ['541fbd4b-8ffb-41cf-b1d2-8c1c282c9312', '5ee957d1-53cc-4767-9c43-832967f621a4'],
  mostActiveCompanies: ['d04b56b2-7fd1-4cb6-af21-55c4686d5659', 'dc0aa731-b63f-429a-9973-27882f1a9657'],
  visitsByAccountOwner: ['5944d7a4-711a-406b-9856-45c431faa867', '649efa05-8313-4b8a-94d1-0e4985ba5b8f'],
  visitsPerWeek: ['8b4d0b80-b610-472b-9a84-0c2e07307c84', '2d601c5a-6e43-4951-964f-f6e7837a1ed8'],
  topPages: ['6ecbfc3f-cf3c-4fa1-a992-d960c608e355', '087f6752-476d-493e-b2e6-c2cc637c5926'],
  trafficSources: ['44b65d57-4099-472e-a632-52ac53838e20', '0e5d7877-091f-4b37-9cbd-9271c1c26f6a'],
  caseStudyPages: ['c44b4eda-dd2d-4e46-961f-d7c74c5d1088', '531d2a1e-1bb9-4b17-9b93-277f8d4222fe'],
} as const;

export const HOT_ACCOUNTS_VIEW = {
  view: '57e22afe-8d1e-4d50-be8e-80edb975f231',
  fieldName: '30948345-51e1-4414-89d9-0ab303001790',
  fieldIntentScore: '2123c29d-3ff6-4724-a640-c1c8c59b086e',
  fieldIntentTier: '6b7c1e08-e131-4212-90e0-9f09aa6a7aa6',
  fieldLastVisit: '9548a9ca-7e40-4e2e-a533-61353173d5e1',
  fieldAccountOwner: 'c3eac527-b003-4e4e-9843-cc55349df58b',
  fieldOpportunities: '07c67221-411f-4949-a8d0-444a53fd3c6d',
  filterGroup: '97144756-53f3-4514-becf-80d4884dec99',
  filterPastDays: '9c44ee55-f857-433a-b686-5030ee3668db',
  filterToday: '487ced72-eeb6-4324-9d59-ede2f688cd8a',
  sortIntent: 'd9939712-519a-4ca5-9877-ff3587e0c56e',
} as const;
export const WEBSITE_INTEREST_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  '9436dc1d-ba29-46ea-b704-4002c4b64af0';

export const RECENT_VISITS_VIEW = {
  view: 'bd293b0d-6c58-49cf-a8f4-5aaddbdfbd9e',
  fieldVisitedAt: 'a6a20b8d-9283-4b5c-9f15-22ecac25a188',
  fieldCompany: '166d9c71-117f-4c78-8446-c043f9dff7d1',
  fieldLandingPage: '8a1674ad-527a-4eef-877b-8ab254a50e2f',
  fieldPages: '1ea452af-acec-45f2-96e0-923e07ecb3f2',
  fieldDuration: '4caf6c3e-7384-48f0-a4b3-55a646143700',
  fieldIntentTier: 'c792f988-ecee-4311-880c-f0250876e0d2',
  fieldSource: '57ca6a39-1f11-402e-848d-81fdd9dc38c4',
  fieldVisitLocation: 'cde6b7ca-96e3-4237-b82c-53657800acc7',
  filterGroup: '61150c90-94a7-489f-8a91-ded42cbc6317',
  filterPastDays: '21e13629-904a-4be3-8718-a7be6d44f221',
  filterToday: '48bc075d-05b2-4f23-9896-226028f938fc',
  sortVisitedAt: 'ef197719-02f8-4408-aaf0-8a45b36ad378',
} as const;

export const OPEN_DEAL_VISITS_VIEW = {
  view: '11be7dcc-60a2-4da3-bd4f-3437824631c4',
  fieldCompany: '9001f98a-3768-4811-b526-748df76efb39',
  fieldVisitedAt: '0338dadc-3d2a-41b7-9386-763c593fe187',
  fieldLandingPage: '1179754b-91c1-4e72-9dc4-f4710f8e135c',
  fieldPages: '1d32845a-8480-4cbe-a989-8d818ba39b1b',
  fieldIntentTier: '8d3a9782-7b73-42e2-bc21-e403169845a8',
  rootFilterGroup: 'dfa31a21-24ad-49fd-aac3-b6ecbe63d218',
  windowFilterGroup: 'fcd1c0ca-c30a-4df0-b36e-6861aa509ca1',
  filterOpenOpportunity: 'c1b9f427-f719-45bf-a6d3-9f0565711706',
  filterPastDays: '119eb774-14f5-48e5-9059-66f1c598207b',
  filterToday: '65ea408a-22b1-43a4-afa9-be4d8d636b9d',
  sortVisitedAt: '33411d77-d833-461c-ae36-ac944a5a4566',
} as const;

export const REVIEW_TASKS_VIEW = {
  view: 'c402faf2-0bec-47e1-bb40-de0cd5c09d76',
  fieldTitle: '16b19724-5566-4727-b2d0-922f8bdb5ac7',
  fieldStatus: 'd7bfa2cc-4a06-4275-8208-b13042859b0a',
  fieldAssignee: 'fb6ac751-bece-453b-9a44-eae56993a9f9',
  fieldCreatedAt: 'd4cf37a7-7a76-4937-ab36-219e9a5a5781',
  fieldDueAt: 'c35f154b-f0f7-4a9c-8fbd-a54252e640d8',
  filterTitle: '44eddb50-413b-456a-966d-477cd177560f',
  filterNotDone: 'c7469c46-d5f5-4fcc-9e8f-32945de3a1e5',
  sortCreatedAt: '769f36f3-911c-496f-aebe-0840a26df1c0',
} as const;

export const ALL_VISITS_VIEW = {
  view: '50408d95-cb4e-423b-a989-a552194d7fb1',
  fieldVisitedAt: '1380f967-f4e2-4b83-87d1-50751ba159b1',
  fieldCompany: '6718f33c-bf14-4752-9415-057fd5f4ed21',
  fieldIntentTier: '2c4999b3-91a9-4949-8593-4d7be88ef70a',
  fieldIntentScore: '4a32853b-b108-4740-ad2e-c8e1ba882dc1',
  fieldLandingPage: '7d14fb7b-1979-471e-802e-7bf0176a89f6',
  fieldPages: '2dd403ab-8c3f-48fa-a318-323c19b772a9',
  fieldDuration: '97545249-d97c-4c3e-aca3-60f2a0e58fad',
  fieldPageDepth: 'b1bba343-936f-4630-b317-4a6fc0827656',
  fieldSource: 'bb80e19f-d51d-44c2-b58c-6797d786d84a',
  fieldMedium: 'e1c86138-c403-4a95-b7df-1c2b59512180',
  fieldCampaign: '6ead7349-9154-4ddf-a0d9-a31a63a5082c',
  fieldOpenOpportunity: '0835848c-26d0-45d6-a86b-6d611740c5ff',
  fieldLeadfeederLink: '62030c75-e919-43ba-a990-af535d5623e5',
  fieldFormSubmitted: '593b1534-0cc2-49ba-9edb-db2437df6794',
  fieldVisitLocation: '19532b23-9ab2-4232-9c5c-cee62d01e061',
  sortVisitedAt: 'f26fceb7-fc69-4b2b-8012-c407b7b485c4',
} as const;
