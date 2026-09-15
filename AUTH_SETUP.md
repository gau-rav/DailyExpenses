# Authentication setup

> Temporary mode: Google OAuth is disabled in the application. Use the dummy email/password login below until real email credentials are implemented.

## Temporary local login

Set these server-side environment variables (or use the defaults):

```env
AUTH_DUMMY_EMAIL=shikha99135@gmail.com
AUTH_DUMMY_PASSWORD=penny123
```

Open the app and sign in with `shikha99135@gmail.com` and `penny123`. A MongoDB-backed user and HTTP-only session are created automatically. The Google OAuth instructions below are retained only for the later re-enable step.

This project uses a Node/Express backend for Google OAuth. Google tokens are handled only on the server. The browser receives an HTTP-only session cookie; access and refresh tokens are never stored in localStorage.

## 1. Install dependencies

```powershell
npm install
```

## 2. Configure MongoDB

MongoDB Compass is a GUI client. The application needs the MongoDB connection URI from Atlas or from a local MongoDB server.

For local development, create `.env.local`:

```env
NODE_ENV=development
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=penny_expenses_local
```

For Render, add these environment variables in the service settings:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=penny_expenses
```

Use a separate database name for local and production. The `users` and `sessions` collections are created automatically after the first successful connection.

In Atlas, add your local IP address under **Network Access**. For Render, allow Render's outbound connection according to your Atlas network policy. A temporary `0.0.0.0/0` rule is convenient for testing but should be restricted for production where possible.

## 3. Create Google OAuth credentials

In Google Cloud Console:

1. Create or select a project.
2. Configure the OAuth consent screen. Add the app name and your email. Add test users while the app is in testing mode.
3. Create **Credentials → OAuth client ID**.
4. Choose **Web application**.
5. Add this authorized redirect URI for local development:

```text
http://localhost:8787/auth/google/callback
```

The redirect URI must match the server value exactly. Do not put the client secret in the React `.env` file.

## 4. Configure the server

Copy `.env.example` to `.env` and fill in the Google client values:

```env
AUTH_PORT=8787
APP_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=penny_expenses_local
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
```

Keep `.env`, `data/`, and the Google client secret out of source control.

## 5. Run the application

Run both servers in separate terminals:

```powershell
npm run server
npm run dev
```

Or use the combined command:

```powershell
npm run dev:full
```

Open `http://localhost:5173`. The Vite proxy forwards `/auth` to the backend on port 8787.

For Render, use this build command so Vite is installed even when `NODE_ENV=production`:

```text
npm install --include=dev && npm run build
```

Use this start command:

```text
node server/index.js
```

For Netlify, the repository includes `netlify.toml`. Netlify builds the React app and deploys `netlify/functions/api.mjs`, which exposes the same routes under `/api`:

```text
Build command: npm install --include=dev && npm run build
Publish directory: dist
Functions directory: netlify/functions
```

Set these Netlify environment variables:

```env
NODE_ENV=production
APP_URL=https://YOUR-SITE.netlify.app
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=penny_expenses
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_REDIRECT_URI=https://YOUR-SITE.netlify.app/api/auth/google/callback
```

Register the same production callback URL in Google Cloud Console. Local development uses `.env.local` and `http://localhost:8787/api/auth/google/callback`.

## Authentication endpoints

- `GET /auth/google` starts Google OAuth.
- `GET /auth/google/callback` validates state and PKCE, verifies the Google ID token, creates or updates the user, and creates a server session.
- `GET /auth/me` returns the authenticated user.
- `POST /auth/logout` revokes the local session and clears the cookie.
- `GET /health` checks that the auth server is running.

MongoDB creates the `users` and `sessions` collections automatically. Sessions contain only a SHA-256 hash of the random cookie token and expire automatically through a MongoDB TTL index after seven days.

## Production checklist

- Set `NODE_ENV=production` so cookies use `Secure`.
- Serve the frontend and backend over HTTPS.
- Set `APP_URL` and `GOOGLE_REDIRECT_URI` to the production HTTPS URLs.
- Add the production callback URI to the Google OAuth client.
- Use MongoDB Atlas or another managed MongoDB deployment for production.
- Use a secret manager for `GOOGLE_CLIENT_SECRET`.
- Restrict OAuth consent-screen test users and publish the app only after completing Google verification if required.
