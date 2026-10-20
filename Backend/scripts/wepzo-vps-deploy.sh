#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/wepzo/vps-hosting.conf"
if [[ ! -r "$CONFIG_FILE" ]]; then
  echo "VPS hosting is not configured. Run Backend/scripts/setup-vps-hosting.sh on the VPS." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$CONFIG_FILE"

ACTION="${1:-}"
WEBSITE_ID="${2:-}"
DOMAIN="${3:-}"
MODULE="${4:-}"

if [[ ! "$WEBSITE_ID" =~ ^[A-Za-z0-9_-]{1,80}$ ]]; then
  echo "Invalid website ID." >&2
  exit 1
fi
if [[ ! "$DOMAIN" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?))+$ ]]; then
  echo "Invalid website domain." >&2
  exit 1
fi
if (( ${#DOMAIN} > 253 )); then
  echo "Website domain is too long." >&2
  exit 1
fi

SITE_DIR="$WEPZO_WEB_ROOT/$WEBSITE_ID"
SITE_ROOT="$SITE_DIR/current"
RELEASES_ROOT="$SITE_DIR/releases"
ACME_ROOT="$WEPZO_WEB_ROOT/acme"
NGINX_AVAILABLE="/etc/nginx/sites-available/wepzo-$WEBSITE_ID"
NGINX_ENABLED="/etc/nginx/sites-enabled/wepzo-$WEBSITE_ID"

if [[ "$ACTION" == "disable" ]]; then
  rm -f -- "$NGINX_ENABLED"
  nginx -t
  systemctl reload nginx
  echo "disabled"
  exit 0
fi
if [[ "$ACTION" != "deploy" ]]; then
  echo "Unsupported action." >&2
  exit 1
fi
case "$MODULE" in
  quick-commerce) APP_DIST="$WEPZO_APP_ROOT/User/quick-commerce/dist" ;;
  e-commerce) APP_DIST="$WEPZO_APP_ROOT/User/E-Commerce/dist" ;;
  store-single) APP_DIST="$WEPZO_APP_ROOT/User/store-single/dist" ;;
  marketing) APP_DIST="$WEPZO_APP_ROOT/User/Marketing/dist" ;;
  general|information-web) APP_DIST="$WEPZO_APP_ROOT/User/General/dist" ;;
  *)
    echo "Hosting is not supported for this website module: $MODULE" >&2
    exit 1
    ;;
esac
if [[ ! -d "$APP_DIST" || ! -f "$APP_DIST/index.html" ]]; then
  echo "The $MODULE storefront build is missing. Build the storefront before deploying." >&2
  exit 1
fi
if ! command -v certbot >/dev/null 2>&1 || [[ -z "${WEPZO_TLS_EMAIL:-}" ]]; then
  echo "Install Certbot and configure a notification email before hosting." >&2
  exit 1
fi

STAGING_ROOT="$WEPZO_WEB_ROOT/.staging-$WEBSITE_ID-$$"
OLD_CONFIG="$NGINX_AVAILABLE.backup-$$"
HAD_ENABLED_SITE=0
BOOTSTRAP_ACTIVE=0
PROMOTED_RELEASE=0
OLD_CURRENT_TARGET=""
if [[ -L "$NGINX_ENABLED" ]]; then HAD_ENABLED_SITE=1; fi
if [[ -f "$NGINX_AVAILABLE" ]]; then cp -a "$NGINX_AVAILABLE" "$OLD_CONFIG"; fi
if [[ -L "$SITE_ROOT" ]]; then OLD_CURRENT_TARGET="$(readlink "$SITE_ROOT")"; fi
restore_failed_deploy() {
  if [[ "$BOOTSTRAP_ACTIVE" == "1" ]]; then
    if [[ -f "$OLD_CONFIG" ]]; then
      mv -f -- "$OLD_CONFIG" "$NGINX_AVAILABLE"
    else
      rm -f -- "$NGINX_AVAILABLE"
    fi
    if [[ "$HAD_ENABLED_SITE" == "0" ]]; then rm -f -- "$NGINX_ENABLED"; fi
    nginx -t && systemctl reload nginx || true
  fi
  if [[ "$PROMOTED_RELEASE" == "1" ]]; then
    if [[ -n "$OLD_CURRENT_TARGET" ]]; then
      RESTORE_LINK="$SITE_DIR/current-restore-$$"
      ln -sfn -- "$OLD_CURRENT_TARGET" "$RESTORE_LINK"
      mv -Tf -- "$RESTORE_LINK" "$SITE_ROOT"
    else
      rm -f -- "$SITE_ROOT"
    fi
  fi
  rm -rf -- "$STAGING_ROOT"
  rm -f -- "$OLD_CONFIG"
}
trap restore_failed_deploy EXIT

install -d -o "$WEPZO_SERVICE_USER" -g www-data -m 0755 "$STAGING_ROOT"
install -d -o root -g www-data -m 0755 "$ACME_ROOT"
cp -a "$APP_DIST/." "$STAGING_ROOT/"
chown -R "$WEPZO_SERVICE_USER":www-data "$STAGING_ROOT"
chmod -R u=rwX,g=rX,o=rX "$STAGING_ROOT"

write_http_config() {
  cat > "$NGINX_AVAILABLE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location ^~ /.well-known/acme-challenge/ {
        root $ACME_ROOT;
        try_files \$uri =404;
    }
    location / { return 503; }
}
EOF
}

BOOTSTRAP_ACTIVE=1
write_http_config
ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"
nginx -t
systemctl reload nginx

if ! certbot certonly --webroot --webroot-path "$ACME_ROOT" --domain "$DOMAIN" \
  --non-interactive --agree-tos --keep-until-expiring --email "$WEPZO_TLS_EMAIL" --no-eff-email; then
  echo "TLS verification failed. Confirm the domain points to this VPS and ports 80/443 are open, then retry." >&2
  exit 1
fi

if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" || ! -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]]; then
  echo "Certbot succeeded but its certificate files are missing for $DOMAIN." >&2
  exit 1
fi

install -d -o "$WEPZO_SERVICE_USER" -g www-data -m 0755 "$RELEASES_ROOT"
RELEASE="$RELEASES_ROOT/$(date -u +%Y%m%d%H%M%S)-$$"
mv -- "$STAGING_ROOT" "$RELEASE"
NEXT_LINK="$SITE_DIR/current-$$"
ln -s -- "$RELEASE" "$NEXT_LINK"
mv -Tf -- "$NEXT_LINK" "$SITE_ROOT"
PROMOTED_RELEASE=1

cat > "$NGINX_AVAILABLE" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location ^~ /.well-known/acme-challenge/ {
        root $ACME_ROOT;
        try_files \$uri =404;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN;
    root $SITE_ROOT;
    index index.html;
    client_max_body_size 50m;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
nginx -t
systemctl reload nginx
BOOTSTRAP_ACTIVE=0
PROMOTED_RELEASE=0
rm -f -- "$OLD_CONFIG"
echo "deployed"
