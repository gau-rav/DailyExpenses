# Google authentication setup

This project uses a Node/Express backend for Google OAuth. Google tokens are handled only on the server. The browser receives an HTTP-only session cookie; access and refresh tokens are never stored in localStorage.

## 1. Install dependencies

```powershell
npm install
```

## 2. Create Google OAuth credentials

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

## 3. Configure the server

Copy `.env.example` to `.env` and fill in the Google client values:

```env
AUTH_PORT=8787
APP_URL=http://localhost:5173
AUTH_DB_PATH=data/penny-auth.sqlite
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
```

Keep `.env`, `data/`, and the Google client secret out of source control.

## 4. Run the application

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

## Authentication endpoints

- `GET /auth/google` starts Google OAuth.
- `GET /auth/google/callback` validates state and PKCE, verifies the Google ID token, creates or updates the user, and creates a server session.
- `GET /auth/me` returns the authenticated user.
- `POST /auth/logout` revokes the local session and clears the cookie.
- `GET /health` checks that the auth server is running.

The SQLite database creates `users` and `sessions` tables automatically. Sessions contain only a SHA-256 hash of the random cookie token and expire after seven days.

## Production checklist

- Set `NODE_ENV=production` so cookies use `Secure`.
- Serve the frontend and backend over HTTPS.
- Set `APP_URL` and `GOOGLE_REDIRECT_URI` to the production HTTPS URLs.
- Add the production callback URI to the Google OAuth client.
- Use a persistent database volume or replace SQLite with PostgreSQL for multiple server instances.
- Use a secret manager for `GOOGLE_CLIENT_SECRET`.
- Restrict OAuth consent-screen test users and publish the app only after completing Google verification if required.
