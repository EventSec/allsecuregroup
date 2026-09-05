# Cloudflare automation for allsecure.group

This folder automates moving `allsecure.group` DNS to Cloudflare (free plan) and
enabling security headers (HSTS, X-Frame-Options, etc.).

## Prerequisites (manual, dashboard)

1. Add the zone in the Cloudflare dashboard: https://dash.cloudflare.com -> "Add a site" -> `allsecure.group` -> Free plan.
2. Cloudflare scans DNS and lets you review the records it found.
3. Create an API token (dashboard -> My Profile -> API Tokens -> Create Token) with:
   - Zone: Zone -> Edit
   - Zone: DNS -> Edit
   - Zone: SSL and Certificates -> Edit
   - Zone: Config Rules / Transform Rules -> Edit
4. Change nameservers at Porkbun to the two Cloudflare nameservers shown.
   Wait (up to 24-72h) for the zone to become "Active".

## Setup

```bash
cp .env.example .env
# edit .env, put your real CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
./setup_zone.sh      # creates DNS records + enables HSTS
./apply_headers.sh   # adds transform rules for security headers
```

> `.env` is git-ignored so the token is never committed.

## Important DNS notes

- **Duplicate DMARC**: the live DNS currently has TWO `_dmarc` TXT records
  (the old `v=DMARC1; p=quarantine` and the new reporting one). This is invalid
  DMARC. The script writes only the single, correct record. Remove the stale one
  from Porkbun before/after migrating so it doesn't come across.
- **DKIM records are CNAMEs** (Proton's current method), not TXT.
- MX records must be **non-proxied** ("DNS only", grey cloud).
- A records for GitHub Pages are **proxied** (orange cloud) so Cloudflare serves the site.

## Verify after Active

```bash
curl -sI https://allsecure.group/ | grep -iE 'x-frame|x-content|referrer|strict-transport'
```

Expected: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: ...`.

Also confirm on dnschecker.org that `mail.protonmail.ch` MX and the DKIM CNAMEs
resolve correctly through Cloudflare.
