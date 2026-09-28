#!/usr/bin/env bash
# One-command Cloud Run deployment for Sign Se Pehle.
#
# Prerequisites: gcloud authenticated, billing enabled on the project, and the Gemini key in
# apps/server/.env (GEMINI_API_KEY=...). Sarvam's key (SARVAM_API_KEY=...) is optional — an
# extra read-aloud voice; without it Google Translate's free voice is still the default.
# Every key goes into Secret Manager byte-exact and is mounted by reference: it never enters
# the image, the repository or the service's env config.
#
# Usage: scripts/deploy.sh [PROJECT_ID] [REGION]
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${2:-asia-south1}"   # Mumbai: closest Cloud Run region to Indian users
REPO="sign-se-pehle"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/apps/server/.env"

echo "==> Project ${PROJECT_ID} (${REGION})"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "==> Enabling required APIs (idempotent)"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com generativelanguage.googleapis.com

echo "==> Ensuring Artifact Registry repository"
if ! gcloud artifacts repositories describe "${REPO}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPO}" --repository-format=docker \
    --location="${REGION}" --description="Sign Se Pehle container images"
fi

# Reads ENV_VAR from apps/server/.env and, when non-empty, stores it as SECRET_NAME (creating
# or versioning it), then grants the runtime service account read access.
store_secret_from_env() {
  local env_var="$1" secret_name="$2"
  [[ -f "${ENV_FILE}" ]] || return 0
  local value
  value="$(grep -E "^${env_var}=" "${ENV_FILE}" | head -n1 | cut -d= -f2- | tr -d '\r\n ')"
  [[ -n "${value}" ]] || return 0
  echo "==> Storing ${env_var} in Secret Manager as ${secret_name} (byte-exact, no trailing newline)"
  local tmp; tmp="$(mktemp)"; printf '%s' "${value}" > "${tmp}"
  if gcloud secrets describe "${secret_name}" >/dev/null 2>&1; then
    gcloud secrets versions add "${secret_name}" --data-file="${tmp}" >/dev/null
  else
    gcloud secrets create "${secret_name}" --data-file="${tmp}" --replication-policy=automatic >/dev/null
  fi
  rm -f "${tmp}"
  local number; number="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  # Least privilege: only the runtime service account may read the secret.
  gcloud secrets add-iam-policy-binding "${secret_name}" \
    --member="serviceAccount:${number}-compute@developer.gserviceaccount.com" \
    --role=roles/secretmanager.secretAccessor >/dev/null
}

store_secret_from_env GEMINI_API_KEY gemini-api-key
store_secret_from_env SARVAM_API_KEY sarvam-api-key

echo "==> Building and deploying with Cloud Build"
gcloud builds submit "${ROOT}" --config "${ROOT}/cloudbuild.yaml" --substitutions="_REGION=${REGION}"

URL="$(gcloud run services describe sign-se-pehle --region="${REGION}" --format='value(status.url)')"
echo "==> Live at ${URL}"
"${ROOT}/scripts/smoke.sh" "${URL}"
