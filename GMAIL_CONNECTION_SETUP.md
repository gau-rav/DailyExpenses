# Gmail connection setup

Step-by-step guide to connect Gmail so PaisaWise can read bank-alert emails and turn them into expenses.

For architecture, security, scheduling, and production verification details, see [GOOGLE_GMAIL_OAUTH_SETUP.md](./GOOGLE_GMAIL_OAUTH_SETUP.md).

## Prerequisites

- A Google account whose Gmail you want to read.
- Access to [Google Cloud Console](https://console.cloud.google.com/).
- The app running locally with `npm run dev:full`.
- A `.env.local` file in the project root (Git-ignored).

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. Go to **APIs & Services → Library** and enable the **Gmail API**.
3. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External** (or **Internal** for a Google Workspace-only account).
   - Fill in the app name, support email, and developer contact.
   - Add the scope:
     ```
     https://www.googleapis.com/auth/gmail.readonly
     ```
   - While the app is in **Testing** mode, add your Gmail address under **Test users**.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Add this authorized redirect URI exactly:
     ```
     http://localhost:8787/api/integrations/gmail/callback
     ```
   - Copy the **Client ID** and **Client secret**.

> The redirect URI must match `GOOGLE_GMAIL_REDIRECT_URI` exactly, including `http` and the port.

## 2. Add environment variables

Edit `.env.local` and add:

```env
GOOGLE_GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GOOGLE_GMAIL_CLIENT_SECRET=your-gmail-client-secret
GOOGLE_GMAIL_REDIRECT_URI=http://localhost:8787/api/integrations/gmail/callback
TOKEN_ENCRYPTION_KEY=<base64 32-byte key>
GMAIL_SYNC_SECRET=<random secret>
GMAIL_INITIAL_LOOKBACK_DAYS=7
```

Generate the encryption key and sync secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Notes:

- You may reuse your existing `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values for the `GOOGLE_GMAIL_*` variables, but the Gmail redirect URI must still be added to that OAuth client.
- `TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key. Changing it later makes stored refresh tokens unreadable, so users must reconnect Gmail.
- `GMAIL_SYNC_SECRET` protects the internal scheduled-sync endpoint.
- `GMAIL_INITIAL_LOOKBACK_DAYS` is clamped to 1–30 days.

## 3. Restart and connect

```bash
npm run dev:full
```

1. Open `http://localhost:5173` and sign in.
2. Go to **Settings → Email auto-capture**.
3. Click **Connect Gmail** and approve the `gmail.readonly` consent.
4. Turn on **Capture emails**.
5. Click **Sync now**, or run a sync from the terminal:

```bash
npm run gmail:sync
```

Captured transactions appear in **Email inbox** for review, or are added automatically when **Add automatically** is enabled and the parser is confident enough.

## 4. What gets read

Only emails matching `GMAIL_QUERY` are scanned. The default query is:

```
(debited OR spent OR "transaction alert" OR "transaction of" OR "has been charged" OR "withdrawn")
```

If no bank emails are found, broaden or narrow it, for example:

```env
GMAIL_QUERY=newer_than:7d (debited OR spent OR alert)
```

or target your bank sender:

```env
GMAIL_QUERY=from:alerts@yourbank.com newer_than:7d
```

The first sync imports `GMAIL_INITIAL_LOOKBACK_DAYS`; later syncs use a two-day overlap with deduplication. Raw email bodies are never stored.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| “Gmail OAuth is not configured” | Missing Gmail client ID/secret or encryption key | Add the variables above and restart the server |
| `redirect_uri_mismatch` | Redirect URI differs from Google Cloud | Add the exact `GOOGLE_GMAIL_REDIRECT_URI` to the OAuth client |
| “Google did not return a refresh token” | Consent already granted without offline access | Disconnect, then reconnect and approve consent again |
| Status shows `needs_reauth` | Token revoked, expired, or consent removed | Click **Reconnect Gmail** |
| Sync returns 409 | Another sync is already running | Wait for the current sync to finish |
| Sync returns `skipped: disabled` | Email capture is toggled off | Turn on **Capture emails** |
| No bank emails found | Query too narrow or outside the lookback window | Adjust `GMAIL_QUERY` / `GMAIL_INITIAL_LOOKBACK_DAYS` |
| “Token encryption is not configured” | Missing or invalid key | Set a valid base64 32-byte `TOKEN_ENCRYPTION_KEY` |

## Production notes

- In **Testing** mode, refresh tokens expire after about 7 days; reconnect as needed.
- `gmail.readonly` is a restricted scope. Public use requires Google OAuth verification and a CASA Tier 2 assessment.
- Add the production redirect URI to the same OAuth client:
  ```
  https://your-domain.com/api/integrations/gmail/callback
  ```
- Schedule the sync at most every 15 minutes. See the scheduling section in [GOOGLE_GMAIL_OAUTH_SETUP.md](./GOOGLE_GMAIL_OAUTH_SETUP.md).
