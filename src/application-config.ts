import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  CLOSED_OPPORTUNITY_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
  EXCLUDED_LEADFEEDER_COMPANY_IDS_VARIABLE_UNIVERSAL_IDENTIFIER,
  LEADFEEDER_ACCOUNT_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
  LEADFEEDER_API_KEY_VARIABLE_UNIVERSAL_IDENTIFIER,
  TASK_INTENT_THRESHOLD_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  author: 'Factorial GmbH',
  websiteUrl: 'https://www.factorial.io',
  applicationVariables: {
    LEADFEEDER_API_KEY: {
      universalIdentifier: LEADFEEDER_API_KEY_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Leadfeeder API key',
      description:
        'Personal API key from Dealfront platform settings → Personal → API keys',
      isSecret: true,
      isRequired: true,
    },
    LEADFEEDER_ACCOUNT_ID: {
      universalIdentifier: LEADFEEDER_ACCOUNT_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Leadfeeder account ID',
      description: 'Leadfeeder account whose website visits are synced',
      isSecret: false,
      isRequired: true,
    },
    TASK_INTENT_THRESHOLD: {
      universalIdentifier: TASK_INTENT_THRESHOLD_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Review task intent threshold',
      description:
        'Unknown companies at or above this intent tier get a "Review website visitor" task (max once per 7 days)',
      type: FieldType.SELECT,
      options: [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
      value: 'high',
      isSecret: false,
    },
    EXCLUDED_LEADFEEDER_COMPANY_IDS: {
      universalIdentifier:
        EXCLUDED_LEADFEEDER_COMPANY_IDS_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Ignored Leadfeeder companies',
      description:
        'Leadfeeder company IDs whose visits are ignored, comma-separated (for example your own company, so internal traffic is left out)',
      value: '',
      isSecret: false,
    },
    CLOSED_OPPORTUNITY_STAGES: {
      universalIdentifier:
        CLOSED_OPPORTUNITY_STAGES_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Closed opportunity stages',
      description:
        'Opportunity stage values that do not count as open, comma-separated',
      value: 'CUSTOMER',
      isSecret: false,
    },
  },
});
