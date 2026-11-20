import { defineHealthCheck } from 'twenty-sdk/define';

import { HEALTH_CHECK_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  createLeadfeederClient,
  LeadfeederApiError,
} from 'src/sync/leadfeeder-client';

export default defineHealthCheck({
  universalIdentifier: HEALTH_CHECK_UNIVERSAL_IDENTIFIER,
  name: 'health-check',
  timeoutSeconds: 10,
  handler: async () => {
    const apiKey = process.env.LEADFEEDER_API_KEY?.trim();
    const accountId = process.env.LEADFEEDER_ACCOUNT_ID?.trim();

    if (!apiKey || !accountId) {
      return { status: 'OK' };
    }

    try {
      const accountIds = await createLeadfeederClient({
        apiKey,
        accountId,
      }).listAccountIds();

      if (!accountIds.includes(accountId)) {
        return {
          status: 'ERROR',
          title: `Leadfeeder account ${accountId} is not accessible with this API key`,
          description: 'Check the account ID or use a key of a user of that account.',
          action: { label: 'Edit variables', location: '#variables' },
        };
      }
    } catch (error) {
      if (
        error instanceof LeadfeederApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        return {
          status: 'ERROR',
          title: 'The Leadfeeder API key was rejected',
          description:
            'Create a new key in Dealfront platform settings → Personal → API keys.',
          action: { label: 'Edit variables', location: '#variables' },
        };
      }

      throw error;
    }

    return { status: 'OK' };
  },
});
