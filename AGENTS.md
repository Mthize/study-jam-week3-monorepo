# GCP 3-Tier App Monorepo

This is a production-style 3-tier monorepo project using ReactJS, NestJS, Drizzle ORM, PostgreSQL, Docker, and Google Cloud Platform.

## Project Structure

- `backend/` - NestJS API
- `frontend/` - ReactJS app
- `infra/` - deployment and cloud configuration
- `docker-compose.yml` - local development orchestration
- `cloudbuild.yaml` - CI/CD pipeline configuration
- `README.md` - setup, run, test, and deployment instructions

## Stack Standards

- Frontend uses ReactJS
- Backend uses NestJS
- ORM uses Drizzle
- Database uses PostgreSQL
- Containerization uses Docker
- Cloud deployment uses GCP Cloud Run
- Container images use GCP Artifact Registry
- Secrets use GCP Secret Manager

## Development Rules

- Do not do everything at once
- Work in phases
- Start with the backend first
- Do not start frontend work until the backend is working and tested
- Prefer small, reviewable changes over large all-in-one scaffolding
- After each phase, summarize what was done, what was tested, and what remains

## Branching Rules

- Use a separate git branch for each major phase or feature
- Keep backend, frontend, and infrastructure work in separate focused branches
- Do not combine all work into one branch

Suggested branch naming:
- `backend/init`
- `backend/auth`
- `backend/docker`
- `backend/deploy`
- `frontend/init`
- `frontend/auth-ui`
- `frontend/integration`
- `infra/cicd`

## Backend-First Workflow

Follow this order strictly:

1. Build backend foundation first
   - create NestJS app
   - configure Drizzle
   - configure PostgreSQL connection
   - create user schema and migrations
   - add `/health` endpoint

2. Build backend auth
   - implement register
   - implement login
   - hash passwords securely
   - add JWT authentication
   - validate requests and responses

3. Test backend before moving on
   - verify backend runs locally
   - verify backend runs in Docker
   - verify database connectivity
   - verify `/health`
   - verify register flow
   - verify login flow

4. Deploy backend first
   - build backend container
   - push image to Artifact Registry
   - deploy backend to Cloud Run
   - verify health endpoint in cloud

5. Only after backend is stable
   - build React frontend
   - connect frontend to backend
   - manually verify register and login flows
   - deploy frontend

## API Requirements

Backend should expose:
- `POST /auth/register`
- `POST /auth/login`
- `GET /health`

Responses should be structured and validation errors should be clear.

## Database Rules

Minimum users table:
- `id`
- `name`
- `surname`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

Rules:
- email must be unique
- password must never be stored in plain text
- schema changes should use Drizzle migrations

## Deployment Rules

- Region: `africa-south1`
- Use GCP-generated domains for now
- Store DB password in Secret Manager
- Do not hardcode secrets
- Use dedicated service accounts for runtime/deployment where needed
- Backend must be healthy before frontend deployment begins

## Testing Rules

- No full unit test suite for now
- Do not skip verification
- Minimum required checks:
  - backend build succeeds
  - backend starts successfully
  - Docker build succeeds
  - `/health` responds successfully
  - register works
  - login works
  - database connectivity works
  - Cloud Run backend deployment succeeds before frontend work continues
