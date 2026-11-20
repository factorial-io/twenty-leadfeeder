import {
  defineField,
  FieldType,
  NumberDataType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { COMPANY_FIELDS } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELDS.leadfeederIntentScore,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'leadfeederIntentScore',
  type: FieldType.NUMBER,
  label: 'Intent score',
  description: 'Latest Leadfeeder intent score (0–10)',
  icon: 'IconFlame',
  universalSettings: { dataType: NumberDataType.FLOAT, decimals: 1 },
  isAuditLogged: false,
});
