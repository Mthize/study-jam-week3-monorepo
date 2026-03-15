# OAuth Provider Configuration

The backend exposes `/auth/google` and `/auth/github` endpoints that launch provider-hosted consent screens. When the provider calls back into `/auth/:provider/callback`, the backend issues the standard JWT the email/password flow uses and redirects back to the frontend with one of the following query parameters:

- `?oauth=success&provider=google&token=<JWT>`
- `?oauth=error&message=<error message>`

## Required environment variables

Set the following variables (Secret Manager in production) before starting the backend or deploying to Cloud Run:

| Name | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Public callback (e.g. `https://backend.example.com/auth/google/callback`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_CALLBACK_URL` | Public callback (e.g. `https://backend.example.com/auth/github/callback`) |
| `FRONTEND_URL` | Base URL the backend redirects the browser to after OAuth (e.g. `https://frontend.example.com`) |
| `FRONTEND_ORIGINS` | Comma-delimited list of allowed browser origins for CORS |

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

## Cloud Run deployment checklist

1. Store each OAuth secret plus `JWT_SECRET` and database credentials inside Secret Manager.
2. When templating the Cloud Run service, surface the environment variables listed above. Remember to append the Cloud Run frontend URL to `FRONTEND_ORIGINS` so its origin is allowed for CORS and redirects.
3. Update the Google and GitHub console entries with the Cloud Run callback URLs before deploying, otherwise the providers will reject the redirected request.
4. Redeploy the backend (`gcloud run deploy ...`) and confirm `/auth/google` and `/auth/github` redirect correctly.
5. Redeploy the frontend afterwards so it is aware of the new OAuth flows and handles the query parameters.

## Manual verification

1. Start the backend with `npm run start:dev` after exporting the required env vars.
2. Start the frontend (`npm run dev`) pointing `VITE_API_BASE_URL` to the backend.
3. Trigger both buttons and ensure the browser lands back on `FRONTEND_URL` with `oauth=success` and `token` present.
4. Repeat with invalid credentials (e.g. revoke provider email access) to verify `oauth=error` flows bubble up a readable message in the UI.
