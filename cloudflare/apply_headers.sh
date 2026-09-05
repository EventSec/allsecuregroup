#!/usr/bin/env bash
# Apply additional security HTTP response headers via Cloudflare Transform Rules (free tier)
# Requires: token with Zone: Transform Rules -> Edit, and zone Active.
set -euo pipefail

ZONE="allsecure.group"
API="https://api.cloudflare.com/client/v4"

if [ -f ".env" ]; then set -a; # shellcheck disable=SC1091
  . ./.env; set +a; fi
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"

AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

ZONE_ID=$(curl -sf "${AUTH[@]}" "${API}/zones?name=${ZONE}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')")
[ -n "$ZONE_ID" ] || { echo "ERROR: zone not found." >&2; exit 1; }
echo "Zone ID: ${ZONE_ID}"

# NOTE: HSTS + nosniff are already handled by the security_header setting.
# This script adds X-Frame-Options and Referrer-Policy via response header transform.
RULESET_URL="${API}/zones/${ZONE_ID}/rulesets/phases/http_response_headers_transform/entrypoint"

echo "==> Fetching existing transform ruleset"
GET_RESP=$(curl -s "${AUTH[@]}" "${RULESET_URL}")
RULESET_ID=$(echo "$GET_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('id',''))" 2>/dev/null || echo "")

RULES=$(cat <<'JSON'
{
  "rules": [
    {
      "expression": "true",
      "description": "Add security headers",
      "action": "rewrite",
      "action_parameters": {
        "headers": {
          "X-Frame-Options": {"operation": "set", "value": "SAMEORIGIN"},
          "Referrer-Policy": {"operation": "set", "value": "strict-origin-when-cross-origin"}
        }
      }
    }
  ]
}
JSON
)

echo "==> Applying transform rules"
if [ -n "$RULESET_ID" ]; then
  echo "    Updating existing ruleset ${RULESET_ID}"
  curl -sf -X PUT "${AUTH[@]}" --data "$RULES" "${RULESET_URL}" >/dev/null
else
  echo "    Creating new ruleset"
  curl -sf -X POST "${AUTH[@]}" --data "$RULES" "${RULESET_URL}" >/dev/null
fi

echo
echo "DONE. Headers applied. Verify with:"
echo "    curl -sI https://${ZONE} | grep -iE 'x-frame|referrer|strict-transport|x-content'"