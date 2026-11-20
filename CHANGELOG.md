# Changelog

All notable changes to this application are documented in this file.

## Unreleased

- Source published on GitHub: https://github.com/factorial-io/twenty-leadfeeder
- Template deployment workflow removed (it targeted a local server)

## 1.1.0 (2026-11-11)

- "Website Interest" dashboard redesigned for sales: an "Act now" tab (key figures, hot accounts, open deals with recent visits, what visitors read, review tasks to assign or close) and an "Insights" tab (weekly visits by intent tier, most active companies, account owners, top pages, traffic sources, case studies)
- Form submissions are recorded on the visit (never the submitted values) and create a review task for unknown companies whatever their intent; visitor city and country on every visit
- More robust sync: catches up after an outage, finds companies whatever the spelling of their stored domain (case, scheme, path, internationalised domains), ignores shared profile domains, pages through all lookups, chunks task creation, avoids duplicate review tasks, locks against overlapping runs, retries temporary server and network errors, skips malformed visits, keeps query strings out of stored paths and referrers
- Synced visits cannot be deleted and their values cannot be changed by users; a visit can be moved to another company
- Fix: merging duplicate companies works again (the read-only Leadfeeder fields on Company blocked Twenty's merge)
- Sidebar "Website Visits" opens a curated list (newest first); review tasks explain the next step; Leadfeeder visit and company IDs are hidden from users
- Saved views: Companies "Website visitors (14 days)", Website Visits "Last 7 days" and "Open deals (30 days)", Tasks "Website visitor reviews"
- Neutral defaults for account ID, ignored companies and closed stages (existing installs keep their values)
- Licensed under MPL 2.0

## 1.0.0

- Website Visit object, Leadfeeder fields on Company, "visited the website" timeline entries
- Hourly Leadfeeder sync: domain matching, review tasks for unknown high-intent visitors, 12-week import on first run, own traffic ignored
- Website Visits on the Company page, "Website Interest" dashboard with four charts
- Health check for the Leadfeeder key and account

## 0.1.0

- Initial application scaffolded with `twenty app init`
