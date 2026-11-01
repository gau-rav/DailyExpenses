# Gmail OAuth setup

This document covers the direct Gmail integration: Google Cloud configuration, OAuth consent, token storage, scheduled syncing, deployment, verification, and operations.

## How it works

1. A signed-in user opens **Settings → Email auto-capture → Connect Gmail**.
2. PaisaWise starts a separate OAuth flow with `gmail.readonly`, `state`, and PKCE.
3. The callback verifies the Google identity and stores the **refresh token encrypted** with AES-256-GCM.
4. A scheduled job refreshes the access token and lists recent bank-alert messages.
5. Each message body is parsed in memory into title, amount, category, payment method, and date.
6. Parsed transactions go to the review inbox, or are auto-added when `Add automatically` is on and the parser confidence is high enough.
7. Only parsed fields are stored. Raw email bodies are never persisted.

PaisaWise uses one Gmail account per PaisaWise user. Connecting a different Google account replaces the previous connection.

## Google Cloud setup

### 1. Create the project and enable the API

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project dedicated to PaisaWise.
3. Go to **APIs & Services → Library**.
4. Enable the **Gmail API**.

### 2. Configure the OAuth consent screen

Use the **External** user type for a public product.

Set:

- App name, user support email, and developer contact email
- App logo (optional)
- Application home page
- Privacy policy URL
- Terms of service URL
- Authorized domains (verify each domain in Google Search Console)

Add the scope:

```text
https://www.googleapis.com/auth/gmail.readonly
```

`gmail.metadata` is not sufficient because transaction details are in the message body.

### 3. Create the OAuth client

1. Go to **APIs & Services → Credentials**.
2. Create an **OAuth client ID** of type **Web application**.
3. Add the authorized redirect URIs.

Local:

```text
http://localhost:8787/api/integrations/gmail/callback
```

Production:

```text
https://your-domain.com/api/integrations/gmail/callback
```

The value must exactly match `GOOGLE_GMAIL_REDIRECT_URI`. Add both local and production URIs to the same client if you use one client for both environments.

Use a **dedicated OAuth client** for Gmail, or reuse the same client values by copying them into the Gmail-specific variables. Gmail OAuth reads `GOOGLE_GMAIL_CLIENT_ID` and `GOOGLE_GMAIL_CLIENT_SECRET`, so enabling Gmail does not accidentally enable the separate Google sign-in flow. The Gmail redirect URI is separate from the Google sign-in redirect URI.

### 4. Publish and verify for public use

`gmail.readonly` is a **restricted scope**. A public app must complete Google OAuth verification, including:

- Scope justification and a demo video
- Privacy policy and data-use disclosures
- Domain and brand verification
- Google API Services User Data Policy / Limited Use compliance
- A **CASA Tier 2** security assessment, renewed annually

While the app is in **Testing** mode, it is limited to test users and refresh tokens expire after about seven days. Testing mode is suitable for development only, not reliable background syncing.

Verification and assessment are performed by Google and an approved assessor; they cannot be completed by application code.

## Environment variables

Add these to `.env.local` and the production environment:

```env
GOOGLE_GMAIL_CLIENT_ID=your-gmail-client-id.apps.googleusercontent.com
GOOGLE_GMAIL_CLIENT_SECRET=your-gmail-client-secret
GOOGLE_GMAIL_REDIRECT_URI=http://localhost:8787/api/integrations/gmail/callback
TOKEN_ENCRYPTION_KEY=your-base64-32-byte-key
GMAIL_SYNC_SECRET=your-random-sync-secret
GMAIL_INITIAL_LOOKBACK_DAYS=7
```

Generate the encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Generate the cron secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Notes:

- `TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key. Changing it makes existing stored refresh tokens unreadable; users must reconnect Gmail.
- `GMAIL_SYNC_SECRET` protects `POST /api/internal/gmail/sync`.
- `GMAIL_INITIAL_LOOKBACK_DAYS` controls the first sync window and is clamped to 1–30 days.
- `GMAIL_QUERY` can override the default bank-alert search query.
- The Gmail OAuth client must include the production redirect URI in Google Cloud.
- Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for Google sign-in only. Gmail uses the `GOOGLE_GMAIL_*` variables.

## Local development

1. Add the variables above to `.env.local`.
2. Add the local redirect URI to the Google OAuth client.
3. Start the app:

```bash
npm run dev:full
```

4. Register or sign in.
5. Open **Settings → Connect Gmail** and grant access.
6. Use **Sync now** or run a sync job manually:

```bash
npm run gmail:sync
```

The manual job requires `MONGODB_URI` and the Gmail encryption/Google client variables.

## API routes

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/integrations/gmail/connect` | Session | Start OAuth with `state` and PKCE |
| `GET` | `/api/integrations/gmail/callback` | Session + OAuth cookies | Verify and store the connection |
| `GET` | `/api/integrations/gmail/status` | Session | Connection state, last sync, and errors |
| `POST` | `/api/integrations/gmail/sync` | Session | Sync the current user now |
| `DELETE` | `/api/integrations/gmail` | Session | Revoke Google access and delete credentials |
| `POST` | `/api/internal/gmail/sync` | `Authorization: Bearer <GMAIL_SYNC_SECRET>` | Scheduled sync for all connected accounts |

The existing `/api/integrations/status` response also includes a `gmail` object so the settings UI can render connection state with one request.

## Scheduling

### Render

`render.yaml` defines a `dailyexpenses-gmail-sync` cron service:

- Schedule: `*/15 * * * *`
- Command: `node server/gmailCron.js`
- The cron service needs `MONGODB_URI`, `MONGODB_DB_NAME`, `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, and `GMAIL_INITIAL_LOOKBACK_DAYS`.

Set the secret values on both the web service and the cron service.

### Netlify or another static host

Netlify functions are request-driven. Use an external scheduler (for example Render Cron, GitHub Actions, or a hosted cron service) to call:

```bash
curl -X POST https://your-domain.com/api/internal/gmail/sync \
  -H "Authorization: Bearer $GMAIL_SYNC_SECRET"
```

Alternatively, deploy `server/gmailCron.js` as a scheduled job with access to the same MongoDB database and Gmail environment variables.

## Data model

`gmail_accounts`:

| Field | Meaning |
| --- | --- |
| `user_id` | PaisaWise user ID (unique) |
| `google_sub` | Google account subject ID (unique) |
| `gmail_email` | Connected Gmail address |
| `refresh_token_enc` | AES-256-GCM encrypted refresh token |
| `scopes` | Granted scopes |
| `status` | `connected`, `needs_reauth`, or `error` |
| `last_internal_date` | Gmail internal date watermark in milliseconds |
| `last_sync_at` | Last sync attempt (success or error) |
| `last_error` | Sanitized error summary |
| `sync_lock_until` | Short-lived lock preventing overlapping syncs |

Captured messages use the existing `ingest_messages` collection and are deduplicated by Gmail message ID through the unique (`user_id`, `external_id`) index.

## Security and privacy

- Refresh tokens are encrypted at rest with AES-256-GCM.
- Access tokens are kept in memory only and refreshed as needed.
- OAuth uses `state`, PKCE, HTTP-only cookies, and a 10-minute flow window.
- The callback requires an active PaisaWise session and binds the flow to the user who started it.
- One Google account cannot be connected to multiple PaisaWise accounts.
- Disconnecting revokes the token at Google and deletes the stored credentials.
- Raw email bodies are never written to MongoDB or logs.
- Error logs contain status codes and user IDs, not email bodies or tokens.
- The internal sync route uses a timing-safe secret comparison.

For a public launch, the privacy policy must describe:

- What Gmail data is accessed (bank alert messages)
- Why it is accessed (expense capture only)
- What is stored (parsed transaction fields, not raw bodies)
- Retention and deletion (disconnect deletes credentials; users can delete captured messages)
- How to revoke access through Google Account permissions
- Compliance with Google API Services User Data Policy and Limited Use requirements

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Connect button says OAuth is not configured | Missing Gmail client ID/secret or encryption key | Set `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, and `TOKEN_ENCRYPTION_KEY` |
| `redirect_uri_mismatch` | Redirect URI differs from Google Cloud | Add the exact `GOOGLE_GMAIL_REDIRECT_URI` to the OAuth client |
| `Google did not return a refresh token` | Consent was already granted without offline access | Disconnect, then reconnect and approve consent again |
| Status shows `needs_reauth` | Token revoked, expired, or consent removed | Click **Reconnect Gmail** |
| Sync returns 409 | Another sync is running | Wait for the current sync to finish |
| Sync returns `skipped: disabled` | Email capture is toggled off | Turn on **Capture emails** |
| No bank emails found | Query too narrow or emails are outside the lookback window | Check `GMAIL_QUERY` and `GMAIL_INITIAL_LOOKBACK_DAYS` |
| `Token encryption is not configured` | Missing or invalid key | Set a valid base64 32-byte `TOKEN_ENCRYPTION_KEY` |
| Existing tokens fail after a key change | Key rotation without migration | Restore the old key or have users reconnect Gmail |

## Verification checklist

Before submitting for Google verification:

- [ ] Privacy policy and terms are live on the production domain
- [ ] The production domain is verified in Google Search Console
- [ ] The Gmail scope is limited to `gmail.readonly`
- [ ] Demo video shows connect, sync, review, disconnect, and revoke
- [ ] Scope justification explains why email body access is necessary
- [ ] Data deletion and disconnect flows are documented
- [ ] No Gmail data is used for advertising, profiling, or model training
- [ ] CASA Tier 2 assessment is scheduled or complete
- [ ] Refresh tokens are encrypted and access is least-privilege
- [ ] Production redirect URI matches exactly

## Operational notes

- Sync at most every 15 minutes. Gmail API quotas are per user and per project.
- The sync processes up to 100 matching messages per account per run.
- The first sync imports the configured lookback window; later syncs use a two-day overlap and deduplication. Reconnecting resets that window and relies on deduplication to avoid duplicates.
- Auto-add still requires `Add automatically` to be enabled and a high-confidence INR debit.
- The cron job logs aggregate counts only.
