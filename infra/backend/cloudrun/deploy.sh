#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../" && pwd)"
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
  "DB_PASSWORD=${DB_PASSWORD_SECRET}:latest"
  "JWT_SECRET=${JWT_SECRET_SECRET}:latest"
)

ENV_VARS=(
  "PORT=3000"
  "DB_NAME=${DB_NAME}"
  "DB_USER=${DB_USER}"
  "DB_SOCKET_PATH=${DB_SOCKET_PATH}"
  "DB_INSTANCE_CONNECTION_NAME=${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
)

echo "Deploying Cloud Run service ${SERVICE_NAME}..."
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --image "${IMAGE}" \
  --allow-unauthenticated="${ALLOW_UNAUTHENTICATED}" \
  --port 3000 \
  --set-env-vars="$(IFS=','; printf '%s' "${ENV_VARS[*]}")" \
  --set-secrets="$(IFS=','; printf '%s' "${SECRET_ARGS[*]}")" \
  --add-cloudsql-instances "${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"

echo "Deployment finished. Fetching service URL..."
gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)'
