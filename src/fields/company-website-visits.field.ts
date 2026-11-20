import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  COMPANY_FIELDS,
  WEBSITE_VISIT_FIELDS,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: COMPANY_FIELDS.websiteVisits,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'websiteVisits',
  label: 'Website Visits',
  icon: 'IconWorldWww',
  relationTargetObjectMetadataUniversalIdentifier:
    WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: WEBSITE_VISIT_FIELDS.company,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
