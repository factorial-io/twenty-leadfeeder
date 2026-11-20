import { defineLogicFunction } from 'twenty-sdk/define';
import { kv } from 'twenty-sdk/logic-function';

import { SYNC_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { createLeadfeederClient } from 'src/sync/leadfeeder-client';
import {
  parseList,
  parseThreshold,
  runSync,
  type LastSuccessfulSync,
  type SyncLock,
} from 'src/sync/run-sync';
import { createTwentyRepository } from 'src/sync/twenty-repository';

const reviewTaskKey = (leadfeederCompanyId: string) =>
  `review-task:${leadfeederCompanyId}`;
const LAST_SUCCESS_KEY = 'sync:last-success';
const INITIAL_IMPORT_DONE_KEY = 'sync:initial-import-done';
const LOCK_KEY = 'sync:lock';

const handler = async () => {
  try {
    return await sync();
  } catch (error) {
    console.error(
      `Leadfeeder sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
};

const sync = async () => {
  const apiKey = process.env.LEADFEEDER_API_KEY?.trim();
  const accountId = process.env.LEADFEEDER_ACCOUNT_ID?.trim();

  if (!apiKey || !accountId) {
    throw new Error(
      'LEADFEEDER_API_KEY and LEADFEEDER_ACCOUNT_ID must be configured',
    );
  }

  const result = await runSync({
    leadfeeder: createLeadfeederClient({ apiKey, accountId }),
    twenty: createTwentyRepository(),
    state: {
      getLastReviewTaskAt: (leadfeederCompanyId) =>
        kv.get<string>(reviewTaskKey(leadfeederCompanyId)),
      setLastReviewTaskAt: (leadfeederCompanyId, createdAt) =>
        kv.set(reviewTaskKey(leadfeederCompanyId), createdAt),
      getLastSuccessfulSync: () => kv.get<LastSuccessfulSync>(LAST_SUCCESS_KEY),
      setLastSuccessfulSync: (value) => kv.set(LAST_SUCCESS_KEY, value),
      isInitialImportDone: async () =>
        (await kv.get<boolean>(INITIAL_IMPORT_DONE_KEY)) === true,
      markInitialImportDone: () => kv.set(INITIAL_IMPORT_DONE_KEY, true),
      getLock: () => kv.get<SyncLock>(LOCK_KEY),
      setLock: async (lock) => {
        if (lock) {
          await kv.set(LOCK_KEY, lock);
        } else {
          await kv.delete(LOCK_KEY);
        }
      },
    },
    threshold: parseThreshold(process.env.TASK_INTENT_THRESHOLD),
    closedOpportunityStages: parseList(process.env.CLOSED_OPPORTUNITY_STAGES),
    excludedLeadfeederCompanyIds: parseList(
      process.env.EXCLUDED_LEADFEEDER_COMPANY_IDS,
    ),
    now: new Date(),
  });

  console.log(`Leadfeeder sync finished: ${JSON.stringify(result)}`);

  return result;
};

export default defineLogicFunction({
  universalIdentifier: SYNC_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'sync-leadfeeder-visits',
  description:
    'Imports Leadfeeder website visits into Website Visits on matching companies: the last 12 weeks on the first run, then the last 48 hours, catching up after an outage',
  timeoutSeconds: 180,
  handler,
  cronTriggerSettings: {
    pattern: '7 * * * *',
  },
});
