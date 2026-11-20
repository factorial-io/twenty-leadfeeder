import { defineTimelineActivityType } from 'twenty-sdk/define';

import { WEBSITE_VISITED_TIMELINE_ACTIVITY_TYPE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineTimelineActivityType({
  universalIdentifier:
    WEBSITE_VISITED_TIMELINE_ACTIVITY_TYPE_UNIVERSAL_IDENTIFIER,
  name: 'websiteVisited',
  label: 'visited the website',
  icon: 'IconWorldWww',
});
