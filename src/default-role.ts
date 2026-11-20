import {
  defineApplicationRole,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

const readWrite = (objectUniversalIdentifier: string) => ({
  objectUniversalIdentifier,
  canReadObjectRecords: true,
  canUpdateObjectRecords: true,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
});

export default defineApplicationRole({
  universalIdentifier: DEFAULT_ROLE_UNIVERSAL_IDENTIFIER,
  label: `${APP_DISPLAY_NAME} sync role`,
  description:
    'Writes Website Visits and their timeline entries, updates Company Leadfeeder fields, reads opportunities, creates review tasks',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: [
    readWrite(WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER),
    readWrite(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier),
    readWrite(STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.task.universalIdentifier),
    readWrite(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.timelineActivity.universalIdentifier,
    ),
    {
      objectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
      canReadObjectRecords: true,
      canUpdateObjectRecords: false,
      canSoftDeleteObjectRecords: false,
      canDestroyObjectRecords: false,
    },
  ],
  fieldPermissions: [],
  permissionFlagUniversalIdentifiers: [],
});
