#!/usr/bin/env bash
# Cloudflare zone + DNS provisioning for allsecure.group
#
# Requires:
#   - Zone added in Cloudflare dashboard on Free plan
#   - CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID exported (or .env)
#   - Nameservers changed at Porkbun -> Cloudflare (zone then Active)
#
# This script recreates ALL existing Porkbun DNS records in Cloudflare so the
# site AND Proton mail keep working after the NS move.
set -euo pipefail

ZONE="allsecure.group"
API="https://api.cloudflare.com/client/v4"

if [ -f ".env" ]; then set -a; # shellcheck disable=SC1091
  . ./.env; set +a; fi
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN in env or .env}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID in env or .env}"

AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

echo "==> Resolving Zone ID for ${ZONE}"
ZONE_ID=$(curl -sf "${AUTH[@]}" "${API}/zones?name=${ZONE}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')")
[ -n "$ZONE_ID" ] || { echo "ERROR: zone ${ZONE} not found on account." >&2; exit 1; }
echo "    Zone ID: ${ZONE_ID}"

# upsert a DNS record (type name content [proxy] [priority])
dns_upsert() {
  local type="$1" name="$2" content="$3" proxied="${4:-false}" prio="${5:-}"
  local json
  json=$(python3 -c "
import json,sys
t,n,c=sys.argv[1],sys.argv[2],sys.argv[3]
p=sys.argv[4]=='true'
r={'type':t,'name':n,'content':c,'proxied':p}
if sys.argv[5]: r['priority']=int(sys.argv[5])
print(json.dumps(r))
" "$type" "$name" "$content" "$proxied" "$prio")
  local existing
  existing=$(curl -sf "${AUTH[@]}" "${API}/zones/${ZONE_ID}/dns_records?type=${type}&name=${name}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'] if d.get('result') else '')" 2>/dev/null || echo "")
  if [ -n "$existing" ]; then
    printf "    update %-4s %-32s -> %s\n" "$type" "$name" "$content"
    curl -sf -X PUT "${AUTH[@]}" --data "$json" "${API}/zones/${ZONE_ID}/dns_records/${existing}" >/dev/null
  else
    printf "    create %-4s %-32s -> %s%s\n" "$type" "$name" "$content" "${prio:+ (prio $prio)}"
    curl -sf -X POST "${AUTH[@]}" --data "$json" "${API}/zones/${ZONE_ID}/dns_records" >/dev/null
  fi
}

echo "==> DNS: A records (GitHub Pages, proxied)"
for ip in 185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153; do
  dns_upsert "A" "@" "$ip" "true"
done

echo "==> DNS: MX records (Proton, NOT proxied)"
dns_upsert "MX" "@" "mail.protonmail.ch."  "false" 10
dns_upsert "MX" "@" "mailsec.protonmail.ch." "false" 20

echo "==> DNS: TXT records (SPF, verifications, DMARC)"
dns_upsert "TXT" "@"          "v=spf1 include:_spf.protonmail.ch ~all" "false"
dns_upsert "TXT" "@"          "protonmail-verification=0902ad5fa6fa91c96f31ffeb06aa51feb90ffe41" "false"
dns_upsert "TXT" "@"          "google-site-verification=RC2_pLp6bPCo6micH4CR5Vr6K5QSzRi4CXpJmRtHRMk" "false"
# Merged single DMARC record (see README note about duplicate DMARC)
dns_upsert "TXT" "_dmarc"     "v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:info@allsecure.group; fo=1" "false"

echo "==> DNS: DKIM CNAME records (Proton)"
dns_upsert "CNAME" "protonmail._domainkey"  "protonmail.domainkey.dbgx5g7fnc7ketn5l6ds2zbg3hlrvu7oxfucxgal3i62opjskxaya.domains.proton.ch." "false"
dns_upsert "CNAME" "protonmail2._domainkey" "protonmail2.domainkey.dbgx5g7fnc7ketn5l6ds2zbg3hlrvu7oxfucxgal3i62opjskxaya.domains.proton.ch." "false"
dns_upsert "CNAME" "protonmail3._domainkey" "protonmail3.domainkey.dbgx5g7fnc7ketn5l6ds2zbg3hlrvu7oxfucxgal3i62opjskxaya.domains.proton.ch." "false"

echo
echo "==> Enabling HSTS on the zone (6 months, include subdomains)"
curl -sf -X PATCH "${AUTH[@]}" \
  --data '{"value":{"enabled":true,"max_age":15552000,"include_subdomains":true,"preload":false,"no_snapshot":false}}' \
  "${API}/zones/${ZONE_ID}/settings/hsts" >/dev/null \
  && echo "    HSTS enabled (max_age=6mo, subdomains=on, preload=off)"

echo
echo "DONE. After this runs and the NS switch is complete, run ./apply_headers.sh"
echo "to add the transform rules (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)."
