# Twenty Leadfeeder

A [Twenty](https://twenty.com) CRM app that brings the website visits identified by [Leadfeeder](https://www.leadfeeder.com) (Dealfront) into your CRM: on every company, in the timeline, as tasks for unknown high-intent visitors, and in a sales dashboard.

Leadfeeder ships native integrations for HubSpot, Salesforce, Pipedrive, Dynamics and Zoho, but not for Twenty. This app fills that gap using only Twenty's official app framework (`twenty-sdk`).

## Features

- **Website Visit records**: one record per Leadfeeder visit, linked to its company. Each holds the landing page, the visited pages with titles, whether a form was submitted (never the submitted values), the visitor's city and country, source/medium/campaign, referrer, duration, the intent score and tier at the time of the visit, and a link to Leadfeeder. Users cannot delete visits or change their synced values; they can move a visit to another company, which merging companies needs.
- **Company fields**: Leadfeeder company ID, intent score, intent tier and last website visit, updated by every sync and kept out of the record timeline, so the hourly sync does not flood it. They stay editable because Twenty's merge of duplicate companies writes every field.
- **Timeline**: every visit appears on the company timeline as "visited the website" at the time of the visit. Expanding the entry shows the visit.
- **Company page**: the company's website visits on its Home tab, newest first.
- **Website Visits** (sidebar): all visits, newest first, with readable columns. The technical Leadfeeder IDs are hidden from users; the app still uses them.
- **Review tasks**: when a company that does not exist in Twenty visits with an intent tier at or above a threshold, or submits a form whatever its intent, the app creates a task "Review website visitor: {company}" with the intent, landing pages, location, a Leadfeeder link and the next step. At most once per company every 7 days, and never while a task for it is still open.
- **Website Interest dashboard** (sidebar), built for daily use by sales:
  - **Act now** tab: key figures (visits in the last 7 days, form submissions in the last 30 days, hot visitors without an account owner, unknown visitors to review); *hot accounts* that visited in the last 14 days, highest intent first, with owner and opportunities; visits from companies with an open deal; a feed of what known companies read in the last 7 days, with time on site and location; the open review tasks
  - **Insights** tab: visits per week by intent tier, most active companies, visiting companies by account owner, top landing pages, traffic sources, most visited case studies
  - The tables are read-only and also saved views: Companies → "Website visitors (14 days)", Website Visits → "Last 7 days" and "Open deals (30 days)", Tasks → "Website visitor reviews"
- **Health check**: the app settings show a banner when the Leadfeeder API key is rejected or the account is not accessible.

The app never creates companies or people.

## Requirements

- Twenty 2.56.0 or later (Cloud or self-hosted)
- A Leadfeeder / Dealfront account and a personal API key (Dealfront platform settings → Personal → API keys)

## Installation

```bash
git clone https://github.com/factorial-io/twenty-leadfeeder.git
cd twenty-leadfeeder
corepack enable
corepack yarn install
npx twenty@2.56.0 auth login --url https://your-workspace.twenty.com --name production
npx twenty@2.56.0 app publish --private --remote production
npx twenty@2.56.0 app install --remote production
```

Then open **Settings → Apps → Leadfeeder Website Visits → Variables**, enter the API key and your Leadfeeder account ID. The first sync runs at the next full hour (minute 7) and imports the last 12 weeks.

Notes:

- Uploading an app requires the **Marketplace Apps** permission on your role. In Twenty 2.56 the role editor does not list it; an admin role has it.
- With npm 12, `app publish` fails with "npm pack returned an invalid package description". Run it with npm 11: `npx -p npm@11 -p twenty@2.56.0 twenty app publish --private --remote production`.

## Configuration

| Variable | Description |
| --- | --- |
| `LEADFEEDER_API_KEY` | Secret, required. Your Dealfront API key. Only the server-side sync can read it. |
| `LEADFEEDER_ACCOUNT_ID` | Required. The Leadfeeder account to sync. |
| `TASK_INTENT_THRESHOLD` | `high` (default), `medium` or `low`. Unknown companies at or above this tier get a review task. |
| `EXCLUDED_LEADFEEDER_COMPANY_IDS` | Leadfeeder company IDs to ignore, comma-separated. Use it for your own company, so internal traffic is left out. |
| `CLOSED_OPPORTUNITY_STAGES` | Opportunity stage values that do not count as open, comma-separated. Default `CUSTOMER` (Twenty's standard stages); adapt it to your pipeline. |

The "Most visited case studies" chart filters landing pages by `CASE_STUDY_PATH_PREFIX` in `src/constants/universal-identifiers.ts`. Adapt it to your website.

## How it works

An hourly logic function (`src/logic-functions/sync-leadfeeder-visits.ts`):

1. Reads Leadfeeder's "Search Web Visits" with the visiting company included: the last 12 weeks on the first successful run, then the last 48 hours, or from the last successful run on after an outage (at most 12 weeks). Rate limits, temporary server errors and network errors are retried with backoff.
2. Normalises the company's URL and alternative URLs (scheme, `www.`, path, case, internationalised domains; shared profile domains such as linkedin.com are ignored) and finds Twenty companies whose stored domain normalises to the same value, whatever its spelling. When several companies share a domain, the oldest one gets the visits.
3. Stores new visits (a unique index on the Leadfeeder visit ID prevents duplicates), adds missing timeline entries, and updates the company fields with the latest values.
4. Creates review tasks for unknown companies at or above the threshold or with a form submission, remembering them for 7 days in the app's key-value store. Visits older than 48 hours never create tasks.

A lock in the key-value store (with an owner check, as the store has no atomic operations) keeps a manual run and the hourly run from overlapping.

Everything is read before the first write, so a failing Leadfeeder or Twenty read leaves no data behind. Every run is idempotent: running it twice over the same window changes nothing, and a run that failed halfway is completed by the next one.

The app runs under its own role, limited to Website Visits, companies, tasks, timeline entries and read access to opportunities.

Costs on Twenty Cloud: a run takes a few seconds, about $0.0004, so roughly $0.30 per month for the hourly schedule. Leadfeeder's visit search does not consume Dealfront credits according to its API documentation.

## Known limitations

- Matching is by domain only. Companies without a domain in Twenty, and Leadfeeder companies without a URL, never match. Only the primary domain of a Twenty company is searched.
- A newly created company gets the visits from then on; older visits within the sync window are linked on the next run, earlier ones are not imported.
- Very busy sites: the sync reads at most 50 pages of 100 visits per run, so more than 5,000 identified visits in its window (the first import, or a catch-up after a long outage) stop the run with a clear error. Until a catch-up run completes, every hourly run reads the whole catch-up window again.
- Twenty's standard pipeline has no "lost" stage, so with the default `CLOSED_OPPORTUNITY_STAGES=CUSTOMER` lost deals still count as open. Set it to your own closed stages.
- "Visits from companies with an open opportunity" uses the opportunity state at the time the visit was imported. Twenty's charts cannot filter visits by a company's current opportunities.
- Uninstalling the app removes its records and fields but keeps the timeline entries (without their link) and the review tasks, which Twenty treats as regular data.
- Timeline entries show "Twenty" as the actor, because they are written by the app.

## Development

See [SETUP.md](SETUP.md) for the local Twenty server.

```bash
corepack yarn typecheck
corepack yarn lint
corepack yarn test:unit
```

## Contributing

Issues and pull requests are welcome at [github.com/factorial-io/twenty-leadfeeder](https://github.com/factorial-io/twenty-leadfeeder/issues). Please run typecheck, lint and unit tests before opening a pull request.

## License

[Mozilla Public License 2.0](LICENSE). Built by [Factorial](https://www.factorial.io).
