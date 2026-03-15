# OAuth Provider Configuration

The backend exposes `/auth/google` and `/auth/github` endpoints that launch provider-hosted consent screens. When the provider calls back into `/auth/:provider/callback`, the backend creates a user (if needed) and issues a short-lived one-time code, then redirects back to the frontend with:

- `?oauth=success&provider=google&code=<one-time-code>`
- `?oauth=error&message=<error message>`

The frontend then exchanges this code for a JWT via `POST /auth/exchange` with `{ "code": "<code>" }`, which returns the same `AuthResponse` format used by the email/password flow. This avoids exposing the JWT in the browser URL.

## Required environment variables

Set the following variables for Cloud Run deployment. Client IDs and secrets must be stored in Secret Manager:

| Name | Purpose | Storage |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Secret Manager (`backend-google-client-id`) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Secret Manager (`backend-google-client-secret`) |
| `GOOGLE_CALLBACK_URL` | Public callback URL | Env var |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID | Secret Manager (`backend-github-client-id`) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret | Secret Manager (`backend-github-client-secret`) |
| `GITHUB_CALLBACK_URL` | Public callback URL | Env var |
| `FRONTEND_URL` | Base URL for OAuth redirects | Env var |
| `FRONTEND_ORIGINS` | Allowed browser origins for CORS | Env var |
| `OAUTH_STATE_SECRET` | Secret for signing OAuth state (HMAC-SHA256) | Secret Manager (`backend-oauth-state-secret`) |

## Secret Manager secret names

Create or update these secrets in GCP Secret Manager:

- `backend-google-client-id` - Google OAuth client ID
- `backend-google-client-secret` - Google OAuth client secret
- `backend-github-client-id` - GitHub OAuth client ID
- `backend-github-client-secret` - GitHub OAuth client secret
- `backend-oauth-state-secret` - OAuth state signing secret (32+ byte random string)

## Cloud Run callback values (current deployment)

The production-like Cloud Run URLs for this project are fixed. Configure your Google and GitHub apps with the exact callback URLs listed below and mirror them in the backend deployment variables/secrets:

- Google callback: `https://backend-305659654950.africa-south1.run.app/auth/google/callback`
- GitHub callback: `https://backend-305659654950.africa-south1.run.app/auth/github/callback`
- Frontend URL: `https://frontend-305659654950.africa-south1.run.app`

Whenever the Cloud Run backend domain changes, update both provider consoles and the `GOOGLE_CALLBACK_URL` / `GITHUB_CALLBACK_URL` env vars before redeploying.

Callbacks **must** use HTTPS for Cloud Run deployments. Local development defaults:

- Google callback: `http://localhost:3000/auth/google/callback`
- GitHub callback: `http://localhost:3000/auth/github/callback`

## Google Cloud Console setup

1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Choose **Web application**.
3. Authorized JavaScript origins should include every value you serve the frontend from (example: `http://localhost:5173`, `https://frontend.example.com`).
4. Authorized redirect URIs must include every backend endpoint instance (local + Cloud Run). Example entries:
   - `http://localhost:3000/auth/google/callback`
   - `https://<cloud-run-backend-domain>/auth/google/callback`
5. Copy the generated client ID/secret into Secret Manager or `.env` for local use.

## GitHub OAuth app setup

1. Navigate to **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL: point to `FRONTEND_URL` (e.g. `https://frontend.example.com`).
3. Authorization callback URL: `https://<cloud-run-backend-domain>/auth/github/callback` plus any local callback you need (GitHub only accepts a single value, so update it when testing locally or use a dev app).
4. After creating the app, generate a client secret and store both `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` securely.

## Runtime availability check

The backend exposes `GET /auth/providers`, which returns `{ google: { enabled: boolean }, github: { enabled: boolean } }`. The frontend uses this endpoint to disable any provider that is not configured. If the endpoint reports `enabled: false`, the service will log the missing env vars at startup—fix the configuration before re-enabling the button.

## Cloud Run deployment checklist

1. Store each OAuth secret in Secret Manager:
   - `backend-google-client-id`
   - `backend-google-client-secret`
   - `backend-github-client-id`
   - `backend-github-client-secret`
   - `backend-oauth-state-secret` (generate a secure 32+ byte random string)
   - Plus existing secrets: `backend-db-password`, `backend-jwt-secret`
2. When deploying to Cloud Run, pass the callback URLs as environment variables:
   - `GOOGLE_CALLBACK_URL=https://backend-305659654950.africa-south1.run.app/auth/google/callback`
   - `GITHUB_CALLBACK_URL=https://backend-305659654950.africa-south1.run.app/auth/github/callback`
   - `FRONTEND_URL=https://frontend-305659654950.africa-south1.run.app`
3. Update the Google and GitHub console entries with the Cloud Run callback URLs before deploying, otherwise the providers will reject the redirected request.
4. Redeploy the backend and confirm `/auth/google` and `/auth/github` redirect correctly.
5. Check backend startup logs for "Google OAuth configured: yes" and "GitHub OAuth configured: yes".
6. Redeploy the frontend afterwards so it is aware of the new OAuth flows and handles the query parameters.

## Manual verification

1. Start the backend with `npm run start:dev` after exporting the required env vars.
2. Start the frontend (`npm run dev`) pointing `VITE_API_BASE_URL` to the backend.
3. Trigger both buttons and ensure the browser lands back on `FRONTEND_URL` with `oauth=success` and a `code` parameter present. The frontend will automatically exchange this code for a JWT.
4. Repeat with invalid credentials (e.g. revoke provider email access) to verify `oauth=error` flows bubble up a readable message in the UI.
