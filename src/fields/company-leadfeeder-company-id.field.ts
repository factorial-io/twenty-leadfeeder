import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { COMPANY_FIELDS } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELDS.leadfeederCompanyId,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'leadfeederCompanyId',
  type: FieldType.TEXT,
  label: 'Leadfeeder company ID',
  icon: 'IconId',
  isAuditLogged: false,
});
