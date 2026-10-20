#!/usr/bin/env bash
set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
  echo "Run this setup with sudo/root." >&2
  exit 1
fi

SERVICE_USER="${1:-}"
APP_ROOT="${2:-}"
TLS_EMAIL="${3:-}"
if [[ -z "$SERVICE_USER" || -z "$APP_ROOT" || -z "$TLS_EMAIL" ]]; then
  echo "Usage: sudo bash Backend/scripts/setup-vps-hosting.sh <backend-service-user> <app-root> <tls-email>" >&2
  exit 1
fi
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "Backend service user does not exist: $SERVICE_USER" >&2
  exit 1
fi
APP_ROOT="$(realpath "$APP_ROOT")"
if [[ ! -f "$APP_ROOT/Backend/routes/memoryApi.js" || ! -d "$APP_ROOT/User" ]]; then
  echo "APP_ROOT must be the WEPZO repository root." >&2
  exit 1
fi
if [[ ! "$APP_ROOT" =~ ^/[A-Za-z0-9_./-]+$ ]]; then
  echo "Use a repository path containing only letters, numbers, slash, dot, underscore, or hyphen." >&2
  exit 1
fi
if [[ ! "$TLS_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Enter a valid Let's Encrypt notification email." >&2
  exit 1
fi
if ! command -v nginx >/dev/null 2>&1; then
  echo "Install and enable Nginx before configuring WEPZO hosting." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js and npm before building the website storefronts." >&2
  exit 1
fi

for storefront in quick-commerce E-Commerce store-single Marketing General; do
  if [[ "$storefront" == "store-single" ]]; then
    npm --prefix "$APP_ROOT/User/$storefront" install --no-audit --no-fund
  fi
  echo "Building $storefront storefront..."
  npm --prefix "$APP_ROOT/User/$storefront" run build
done

install -d -m 0755 /etc/wepzo /var/www/wepzo-sites
install -o root -g root -m 0750 "$APP_ROOT/Backend/scripts/wepzo-vps-deploy.sh" /usr/local/sbin/wepzo-vps-deploy
cat > /etc/wepzo/vps-hosting.conf <<EOF
WEPZO_SERVICE_USER='$SERVICE_USER'
WEPZO_APP_ROOT='$APP_ROOT'
WEPZO_WEB_ROOT='/var/www/wepzo-sites'
WEPZO_TLS_EMAIL='$TLS_EMAIL'
EOF
chown root:root /etc/wepzo/vps-hosting.conf
chmod 0600 /etc/wepzo/vps-hosting.conf

SUDOERS_FILE="/etc/sudoers.d/wepzo-vps-hosting"
printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/wepzo-vps-deploy\n' "$SERVICE_USER" > "$SUDOERS_FILE"
chmod 0440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

echo "WEPZO VPS hosting configured for $SERVICE_USER."
echo "Ensure ports 80 and 443 are open. Install Certbot to enable automatic HTTPS."
