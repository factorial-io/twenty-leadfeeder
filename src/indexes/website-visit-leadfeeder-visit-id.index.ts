import { defineIndex } from 'twenty-sdk/define';

import {
  WEBSITE_VISIT_FIELDS,
  WEBSITE_VISIT_LEADFEEDER_ID_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  WEBSITE_VISIT_LEADFEEDER_ID_INDEX_UNIVERSAL_IDENTIFIER,
  WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineIndex({
  universalIdentifier: WEBSITE_VISIT_LEADFEEDER_ID_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: WEBSITE_VISIT_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier:
        WEBSITE_VISIT_LEADFEEDER_ID_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: WEBSITE_VISIT_FIELDS.leadfeederVisitId,
    },
  ],
});
