#!/usr/bin/env bash
# One-command Cloud Run deployment for Sign Se Pehle.
#
# Prerequisites: gcloud authenticated, billing enabled on the project, and the Gemini key in
# apps/server/.env (GEMINI_API_KEY=...). The key goes into Secret Manager byte-exact and is
# mounted by reference: it never enters the image, the repository or the service's env config.
#
# Usage: scripts/deploy.sh [PROJECT_ID] [REGION]
set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${2:-asia-south1}"   # Mumbai: closest Cloud Run region to Indian users
REPO="sign-se-pehle"
SECRET="gemini-api-key"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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

ENV_FILE="${ROOT}/apps/server/.env"
if [[ -f "${ENV_FILE}" ]]; then
  KEY="$(grep -E '^GEMINI_API_KEY=' "${ENV_FILE}" | head -n1 | cut -d= -f2- | tr -d '\r\n ')"
  if [[ -n "${KEY}" ]]; then
    echo "==> Storing the Gemini key in Secret Manager (byte-exact, no trailing newline)"
    TMP="$(mktemp)"; printf '%s' "${KEY}" > "${TMP}"
    if gcloud secrets describe "${SECRET}" >/dev/null 2>&1; then
      gcloud secrets versions add "${SECRET}" --data-file="${TMP}" >/dev/null
    else
      gcloud secrets create "${SECRET}" --data-file="${TMP}" --replication-policy=automatic >/dev/null
    fi
    rm -f "${TMP}"
    NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
    # Least privilege: only the runtime service account may read the secret.
    gcloud secrets add-iam-policy-binding "${SECRET}" \
      --member="serviceAccount:${NUMBER}-compute@developer.gserviceaccount.com" \
      --role=roles/secretmanager.secretAccessor >/dev/null
  fi
fi

echo "==> Building and deploying with Cloud Build"
gcloud builds submit "${ROOT}" --config "${ROOT}/cloudbuild.yaml" --substitutions="_REGION=${REGION}"

URL="$(gcloud run services describe sign-se-pehle --region="${REGION}" --format='value(status.url)')"
echo "==> Live at ${URL}"
"${ROOT}/scripts/smoke.sh" "${URL}"
