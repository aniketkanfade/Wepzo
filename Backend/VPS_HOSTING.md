# Hosting tenant websites on the WEPZO VPS

After the one-time VPS setup, a published tenant can host or update its selected
subdomain/custom domain from the Website Dashboard. The deploy operation copies
the module's built storefront to a website-specific directory, configures an
Nginx virtual host and requests a Let's Encrypt certificate. The Nginx host
forwards `/api` and `/uploads` to the WEPZO backend, which resolves the tenant
from the requested domain.

## One-time Ubuntu setup

1. Point `*.wepzo.in` to the VPS and open inbound ports 80 and 443. For a
   tenant-owned custom domain, the tenant must point its A record to the VPS
   before deploying.
2. Install Node.js/npm, Nginx, and Certbot on the VPS. Keep the WEPZO backend
   running on `127.0.0.1:5000` (or update the deploy helper if its port differs).
3. From the WEPZO repository root, run:

   ```bash
   sudo bash Backend/scripts/setup-vps-hosting.sh <backend-service-user> "$PWD" <tls-notification-email>
   ```

   For example, use the Linux account that runs the Node backend as
   `<backend-service-user>`. The setup builds Quick Commerce, E-Commerce,
   Store Singlepage, Marketing, and General storefronts, installs the restricted deployment
   helper, and grants that service account permission to invoke only that
   helper through sudo. Do not run the Node backend as root.
4. Restart the backend after deploying the code update. The helper installs one
   Nginx site per tenant under `/var/www/wepzo-sites/<website-id>`. Certbot's
   renewal challenge files use the persistent
   `/var/www/wepzo-sites/acme` webroot.

The deploy helper supports Quick Commerce, E-Commerce, Store Singlepage,
Marketing, and General/Information Web storefronts.

The deploy action requires a published website with an active service and a
saved subdomain/custom domain. It only reports success after Nginx is valid and
HTTPS certificate verification succeeds. If certificate issuance fails, check
DNS propagation and firewall access, then retry from the Website Dashboard.
The hosting secrets/configuration stay on the VPS; never put SSH credentials in
the browser or source code.
