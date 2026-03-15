#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../" && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

: "${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-africa-south1}"
SERVICE_NAME="${SERVICE_NAME:-backend}"
REPOSITORY="${REPOSITORY:-backend}"
CLOUD_SQL_INSTANCE="${CLOUD_SQL_INSTANCE:-backend-sql}"
DB_NAME="${DB_NAME:-study_jam}"
DB_USER="${DB_USER:-backend_app}"
DB_SOCKET_PATH="${DB_SOCKET_PATH:-/cloudsql}"
DB_PASSWORD_SECRET="${DB_PASSWORD_SECRET:-backend-db-password}"
JWT_SECRET_SECRET="${JWT_SECRET_SECRET:-backend-jwt-secret}"
DB_PASSWORD_VERSION="${DB_PASSWORD_VERSION:-latest}"
JWT_SECRET_VERSION="${JWT_SECRET_VERSION:-latest}"
: "${FRONTEND_URL:?Set FRONTEND_URL (e.g. https://frontend-305659654950.africa-south1.run.app)}"
: "${GOOGLE_CALLBACK_URL:?Set GOOGLE_CALLBACK_URL}"
: "${GITHUB_CALLBACK_URL:?Set GITHUB_CALLBACK_URL}"
GOOGLE_CLIENT_ID_SECRET="${GOOGLE_CLIENT_ID_SECRET:-backend-google-client-id}"
GITHUB_CLIENT_ID_SECRET="${GITHUB_CLIENT_ID_SECRET:-backend-github-client-id}"
GOOGLE_CLIENT_SECRET_SECRET="${GOOGLE_CLIENT_SECRET_SECRET:-backend-google-client-secret}"
GITHUB_CLIENT_SECRET_SECRET="${GITHUB_CLIENT_SECRET_SECRET:-backend-github-client-secret}"
OAUTH_STATE_SECRET_SECRET="${OAUTH_STATE_SECRET_SECRET:-backend-oauth-state-secret}"
GOOGLE_CLIENT_ID_VERSION="${GOOGLE_CLIENT_ID_VERSION:-latest}"
GITHUB_CLIENT_ID_VERSION="${GITHUB_CLIENT_ID_VERSION:-latest}"
GOOGLE_CLIENT_SECRET_VERSION="${GOOGLE_CLIENT_SECRET_VERSION:-latest}"
GITHUB_CLIENT_SECRET_VERSION="${GITHUB_CLIENT_SECRET_VERSION:-latest}"
OAUTH_STATE_SECRET_VERSION="${OAUTH_STATE_SECRET_VERSION:-latest}"
FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-${FRONTEND_URL}}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
ALLOW_UNAUTHENTICATED="${ALLOW_UNAUTHENTICATED:-true}"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/backend:${IMAGE_TAG}"

echo "Using image: ${IMAGE}"

if ! gcloud artifacts repositories describe "${REPOSITORY}" --location="${REGION}" >/dev/null 2>&1; then
  echo "Creating Artifact Registry repository ${REPOSITORY} in ${REGION}..."
  gcloud artifacts repositories create "${REPOSITORY}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Study Jam backend images"
fi

echo "Submitting Docker build via Cloud Build..."
gcloud builds submit "${BACKEND_DIR}" --tag "${IMAGE}" --project "${PROJECT_ID}"

SECRET_ARGS=(
  "DB_PASSWORD=${DB_PASSWORD_SECRET}:${DB_PASSWORD_VERSION}"
  "JWT_SECRET=${JWT_SECRET_SECRET}:${JWT_SECRET_VERSION}"
  "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID_SECRET}:${GOOGLE_CLIENT_ID_VERSION}"
  "GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID_SECRET}:${GITHUB_CLIENT_ID_VERSION}"
  "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET_SECRET}:${GOOGLE_CLIENT_SECRET_VERSION}"
  "GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET_SECRET}:${GITHUB_CLIENT_SECRET_VERSION}"
  "OAUTH_STATE_SECRET=${OAUTH_STATE_SECRET_SECRET}:${OAUTH_STATE_SECRET_VERSION}"
)

ENV_VARS=(
  "PORT=3000"
  "DB_NAME=${DB_NAME}"
  "DB_USER=${DB_USER}"
  "DB_SOCKET_PATH=${DB_SOCKET_PATH}"
  "DB_INSTANCE_CONNECTION_NAME=${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
  "FRONTEND_URL=${FRONTEND_URL}"
  "GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL}"
  "GITHUB_CALLBACK_URL=${GITHUB_CALLBACK_URL}"
)

if [[ -n "${FRONTEND_ORIGINS}" ]]; then
  ENV_VARS+=("FRONTEND_ORIGINS=${FRONTEND_ORIGINS}")
fi

echo "Deploying Cloud Run service ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
AUTH_FLAG="--allow-unauthenticated"
if [ "${ALLOW_UNAUTHENTICATED:-true}" != "true" ]; then
  AUTH_FLAG="--no-allow-unauthenticated"
fi
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --image "${IMAGE}" \
  --port 3000 \
  --set-env-vars="$(IFS=','; printf '%s' "${ENV_VARS[*]}")" \
  --set-secrets="$(IFS=','; printf '%s' "${SECRET_ARGS[*]}")" \
  --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"

echo "Deployment finished. Fetching service URL..."
gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)'
