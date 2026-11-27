#!/usr/bin/env bash
# Sends one signed request notification to the local n8n workflow and prints the HTTP status.
# Usage: LENDLOOP_WEBHOOK_SECRET=... scripts/send-test-notification.sh [valid|tampered|stale|spaced] [notificationId]
# Send "valid" twice with the same notificationId to test the duplicate case.
set -euo pipefail

: "${LENDLOOP_WEBHOOK_SECRET:?Set LENDLOOP_WEBHOOK_SECRET (same value as the n8n Crypto credential)}"
url="${N8N_REQUEST_WEBHOOK_URL:-http://localhost:5678/webhook/lendloop-request-notification}"
mode="${1:-valid}"
case "$mode" in
  valid | tampered | stale | spaced) ;;
  *)
    echo "Usage: $0 [valid|tampered|stale|spaced] [notificationId]" >&2
    exit 1
    ;;
esac
notification_id="${2:-test-loan-$(date +%s):approved}"

now_ms=$(($(date +%s) * 1000))
sent_at=$now_ms
[ "$mode" = stale ] && sent_at=$((now_ms - 6 * 60 * 1000))

body="{\"notificationId\":\"$notification_id\",\"event\":\"approved\",\"loanId\":\"test-loan\",\"recipientId\":\"test-user\",\"recipientFirstName\":\"Ben\",\"otherPartyFirstName\":\"Asha\",\"toolName\":\"Drill\",\"startDate\":\"2026-12-01\",\"endDate\":\"2026-12-05\",\"sentAt\":$sent_at}"
# Same fields with odd spacing: proves n8n hashes the raw bytes, not re-serialised JSON.
[ "$mode" = spaced ] && body="{ ${body:1}" && body="${body//\":/\" :  }" && body="${body//,\"/ ,  \"}"

signature=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$LENDLOOP_WEBHOOK_SECRET" | awk '{print $NF}')
# Change the body after signing, like an attacker would.
[ "$mode" = tampered ] && body="${body/Drill/Ladder}"

curl -s -o /dev/null -w "$mode ($notification_id): HTTP %{http_code}\n" \
  -X POST "$url" \
  -H 'Content-Type: application/json' \
  -H "X-LendLoop-Signature: $signature" \
  --data-binary "$body"
