# Dashboard Admin — MWS Hub

## Objective

Redesign and implement the Admin Dashboard as a proper **admin command center** for MWS Hub.

The current Dashboard is too empty and only contains:
- Welcome message
- Unit / Unit ID
- Quick Actions

Make it useful for daily admin monitoring without changing unrelated pages.

---

## First: Inspect Existing Data

Before writing UI code, inspect:

- `AdminDashboardData`
- `adminApi.dashboard()`
- Existing admin API methods
- Existing `AdminReport` type
- Existing Applications API/data
- Existing Broken Tools/report API/data
- Backend dashboard/report endpoints if needed to understand what data is already available

### Important

**Do NOT invent or hardcode statistics.**

Use only data that already exists in the current API/backend.

If a required statistic is not available from the existing API:

- Do not create fake numbers
- Do not modify the backend in this task
- Show a proper empty/unavailable state instead
- Keep the UI ready for future API data

---

# Dashboard Content

## 1. Header

Keep the page header clean and compact.

Title:

`Dashboard`

Subtitle:

`Overview of your MWS Hub administration`

Keep the existing breadcrumb if it fits the current design.

---

## 2. Summary Metrics

Create a 4-card summary section.

Metrics:

1. **Total Applications**
   - Total applications in the catalog

2. **Published Applications**
   - Applications currently visible/discoverable in the Hub

3. **Hidden Applications**
   - Applications currently hidden from the Hub

4. **Open Reports**
   - Broken Tools reports that still require attention

Each card should contain:

- Relevant Lucide icon
- Small uppercase/secondary label
- Large number
- Optional short supporting text

Example visual hierarchy:

```text
┌─────────────────────────────┐
│  icon    TOTAL APPLICATIONS │
│                             │
│          24                 │
│          Applications      │
└─────────────────────────────┘