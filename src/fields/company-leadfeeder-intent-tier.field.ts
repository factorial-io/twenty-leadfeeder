import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { INTENT_TIER_OPTIONS } from 'src/constants/intent-tier';
import { COMPANY_FIELDS } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELDS.leadfeederIntentTier,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  name: 'leadfeederIntentTier',
  type: FieldType.SELECT,
  label: 'Intent tier',
  description: 'Latest Leadfeeder intent tier',
  icon: 'IconFlame',
  options: INTENT_TIER_OPTIONS,
  isAuditLogged: false,
});
