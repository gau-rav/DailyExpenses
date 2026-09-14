# Penny Google Sheets setup

The app now supports Google Sheets through Google Apps Script with localStorage fallback.

## 1. Apps Script

Open the `Penny Expenses` spreadsheet, select `Extensions > Apps Script`, and paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs). Save it, run `doGet` once to authorize, then deploy it as a Web app:

- Execute as: **Me**
- Who has access: **Anyone**

Copy the deployment URL ending in `/exec`.

## 2. Sheet columns

Use this exact first-row structure in the `Expenses` tab:

```text
id | title | amount | category | payment | date | dueDate | notes | recurring | status | createdAt | updatedAt | deletedAt
```

The Apps Script creates the header automatically when the tab is empty. Valid categories are Food, Transport, Bills, Shopping, Entertainment, Health, Rent, Education, and Other. Valid payment methods are Card, Cash, Bank transfer, and UPI. Valid statuses are Pending, Paid, Due Today, Upcoming, and Overdue.

## 3. Local environment

Copy `.env.example` to `.env.local` and replace the placeholder:

```env
VITE_EXPENSES_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Restart the Vite server after changing the environment file.

## 4. Behavior

- Reads remote expenses on startup when the API URL is configured.
- Writes add, edit, delete, restore, and mark-paid actions to Sheets.
- Caches the latest successful response in localStorage.
- Queues failed writes in `penny-expense-sync-queue` and retries them when the browser reconnects.
- Runs fully offline when the API URL is not configured.

The Apps Script web URL is public. Do not use this setup for sensitive or multi-tenant data without adding authentication.
