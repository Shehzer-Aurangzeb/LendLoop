#!/usr/bin/env bash
# Asks local Convex for today's overdue reminders with a signed request and prints the body and HTTP status.
# Usage: CONVEX_WEBHOOK_SECRET=... scripts/fetch-overdue-reminders.sh [valid|tampered|stale]
set -euo pipefail

: "${CONVEX_WEBHOOK_SECRET:?Set CONVEX_WEBHOOK_SECRET (same value as the Convex env var)}"
url="${CONVEX_SITE_URL:-http://127.0.0.1:3211}/overdue-reminders/due"
mode="${1:-valid}"
case "$mode" in
  valid | tampered | stale) ;;
  *)
    echo "Usage: $0 [valid|tampered|stale]" >&2
    exit 1
    ;;
esac

now_ms=$(($(date +%s) * 1000))
sent_at=$now_ms
[ "$mode" = stale ] && sent_at=$((now_ms - 6 * 60 * 1000))

body="{\"sentAt\":$sent_at}"
signature=$(printf '%s' "$body" | openssl dgst -sha256 -hmac "$CONVEX_WEBHOOK_SECRET" | awk '{print $NF}')
# Change the body after signing, like an attacker would.
[ "$mode" = tampered ] && body="{\"sentAt\":$((sent_at + 1))}"

curl -s -w "\n$mode: HTTP %{http_code}\n" \
  -X POST "$url" \
  -H 'Content-Type: application/json' \
  -H "X-LendLoop-Signature: $signature" \
  --data-binary "$body"
