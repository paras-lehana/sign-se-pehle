#!/usr/bin/env bash
# Post-deploy smoke test against the PUBLIC URL (the same origin browsers use).
# Fails loudly if the page, the health check or a live analysis does not work.
#
# Usage: scripts/smoke.sh https://sign-se-pehle-xxxx.asia-south1.run.app
set -euo pipefail
BASE="${1:?usage: smoke.sh <base-url>}"

echo "--> GET / (web app shell)"
curl -fsS -o /dev/null -w "   %{http_code} in %{time_total}s\n" "${BASE}/"

echo "--> GET /api/health"
curl -fsS "${BASE}/api/health"; echo

echo "--> POST /api/speech (read-aloud voices)"
curl -fsS -o /tmp/smoke-speech.bin -D - -X POST "${BASE}/api/speech" \
  -H 'content-type: application/json' \
  -d '{"text":"Read every clause before you sign.","language":"en"}' \
  | grep -i '^x-speech-voice\|^content-type' | tr -d '\r'
echo "   $(wc -c < /tmp/smoke-speech.bin) bytes of audio"; rm -f /tmp/smoke-speech.bin

echo "--> POST /api/analyze (live Gemini path)"
BODY='{"language":"en","role":"tenant","document":{"type":"text","text":"RENT AGREEMENT. 1. Rent: The tenant shall pay Rs. 20,000 per month. 2. Security deposit: The tenant shall pay a security deposit of Rs. 1,20,000 refundable at the sole discretion of the landlord. 3. The landlord may enter the premises at any time without notice."}}'
curl -fsS -X POST "${BASE}/api/analyze" -H 'content-type: application/json' -d "${BODY}" \
  | python -c "import sys,json; d=json.load(sys.stdin); p=d['provenance']; print('   mode:', p['mode'], '| models:', p['models'], '| flags:', len(d['flags']), '| clauses:', len(d['clauses']), '| score:', d['score']['value'])"
echo "==> Smoke test passed"
