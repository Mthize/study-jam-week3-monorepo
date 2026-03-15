## Backend Deployment (Phase 4)

This folder contains the assets needed to ship the NestJS backend to Google Cloud Run using Artifact Registry, Cloud SQL, and Secret Manager. The deployment flow intentionally keeps everything backend-only.

### 1. Prerequisites

- GCP project with billing enabled (`$PROJECT_ID`).
- `gcloud` CLI authenticated (`gcloud auth login`) and configured (`gcloud config set project $PROJECT_ID`).
- `docker` CLI available for local image builds.
- Cloud SQL Postgres instance in `africa-south1`, e.g. `backend-sql`, with database `study_jam` and user `backend_app`.
- Artifact Registry repository (regional) named `backend` in `africa-south1`.
- Secret Manager entries:
  - `backend-jwt-secret` containing the JWT signing secret.
  - `backend-db-password` containing the `backend_app` DB password.
  - optional: set `DB_PASSWORD_VERSION` / `JWT_SECRET_VERSION` (defaults to `latest`).
- Configure `FRONTEND_ORIGINS` with comma-separated origins (e.g. `https://frontend.example.com,http://localhost:5173`) so CORS stays locked down.

### 2. Artifact Registry & Image Build

The helper script `cloudrun/deploy.sh` builds the backend Docker image from `backend/`, pushes it to Artifact Registry, and deploys the Cloud Run service. Key environment variables before running the script:

```
export PROJECT_ID="your-gcp-project"
export REGION="africa-south1"
export SERVICE_NAME="backend"
export REPOSITORY="backend"
export CLOUD_SQL_INSTANCE="backend-sql"
export DB_NAME="study_jam"
export DB_USER="backend_app"
export DB_PASSWORD_SECRET="backend-db-password"
export JWT_SECRET_SECRET="backend-jwt-secret"
export DB_PASSWORD_VERSION="latest"   # optional override
export JWT_SECRET_VERSION="latest"     # optional override
export FRONTEND_ORIGINS="https://frontend.example.com,http://localhost:5173"
# optional overrides
# export IMAGE_TAG="manual-tag"
# export ALLOW_UNAUTHENTICATED="true"
```

Then run:

```
./infra/backend/cloudrun/deploy.sh
```

The script will:

1. Ensure the Artifact Registry repo exists.
2. Submit the Docker build (`gcloud builds submit`) for the backend.
3. Deploy to Cloud Run with Cloud SQL attachment and secret-mounted env vars.

### 3. Cloud Run YAML (Optional)

`cloudrun/service.yaml` mirrors the deployment flags in declarative form. Replace placeholders (`${PROJECT_ID}`, etc.) then run:

```
gcloud beta run services replace infra/backend/cloudrun/service.yaml \
  --region=africa-south1 --project=$PROJECT_ID
```

### 4. Runtime Environment Variables

`database.module.ts` now supports three modes:

1. Direct `DATABASE_URL` secret.
2. Cloud SQL Unix sockets via `DB_INSTANCE_CONNECTION_NAME`, `DB_SOCKET_PATH`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. TCP host/port via `DB_HOST`, `DB_PORT`, plus the same credentials.

Cloud Run deploys with mode (2). Adjust Secret Manager + env vars if you choose a different approach.

### 5. Post-Deployment Verification

After deployment, grab the Cloud Run HTTPS URL and verify:

```
curl -sSf https://<cloud-run-url>/health

curl -sSf -X POST https://<cloud-run-url>/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Cloud","surname":"Run","email":"cloud.run@example.com","password":"Passw0rd!"}'

curl -sSf -X POST https://<cloud-run-url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cloud.run@example.com","password":"Passw0rd!"}'
```

Successful responses (200/201) complete Phase 4 and unlock front-end work.
