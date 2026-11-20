import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { COMPANY_FIELDS } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELDS.lastWebsiteVisit,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'lastWebsiteVisit',
  type: FieldType.DATE_TIME,
  label: 'Last website visit',
  icon: 'IconCalendarEvent',
  isAuditLogged: false,
});
