# Wepzo Marketing OAuth setup

Marketing workspace users can authorize Instagram, Facebook, Meta Business, YouTube, Google Ads, and LinkedIn from their own account. The backend stores OAuth tokens encrypted with AES-256-GCM; provider secrets and tokens never go to the browser.

## Backend environment

Add these values to `Backend/.env` (keep the encryption key private and stable across restarts):

```env
BACKEND_PUBLIC_URL=https://api.your-domain.example
MARKETING_FRONTEND_URL=https://marketing.your-domain.example
SOCIAL_TOKEN_ENCRYPTION_KEY=replace-with-a-long-random-secret

META_CLIENT_ID=
META_CLIENT_SECRET=
META_GRAPH_VERSION=v23.0
# Optional; otherwise each callback is built from BACKEND_PUBLIC_URL.
# INSTAGRAM_OAUTH_REDIRECT_URI=https://api.your-domain.example/api/marketing/integrations/callback/instagram
# FACEBOOK_OAUTH_REDIRECT_URI=https://api.your-domain.example/api/marketing/integrations/callback/facebook
# META_BUSINESS_OAUTH_REDIRECT_URI=https://api.your-domain.example/api/marketing/integrations/callback/meta-business

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Optional. If omitted, callback is built from BACKEND_PUBLIC_URL per platform.
# YOUTUBE_OAUTH_REDIRECT_URI=https://api.your-domain.example/api/marketing/integrations/callback/youtube
# GOOGLE_ADS_OAUTH_REDIRECT_URI=https://api.your-domain.example/api/marketing/integrations/callback/google-ads

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
# Optional. If omitted, callback is built from BACKEND_PUBLIC_URL.
# LINKEDIN_OAUTH_REDIRECT_URI=https://api.your-domain.example/api/marketing/integrations/callback/linkedin
```

Generate the encryption key with a cryptographically secure random generator. Do not rotate it after accounts have connected unless you first decrypt and re-encrypt every saved token. Register each callback URL exactly as shown, including each distinct callback path for shared Meta and Google credentials.

## Provider console

Register the exact callback URL(s) in each provider app. Configure the requested products, scopes, HTTPS redirect URLs, and app review/verification required by that provider. Wepzo requests:

- Meta Instagram: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `read_insights`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`; Facebook Pages also requests `pages_manage_posts` and `read_insights`.
- Google: `youtube.upload`, YouTube read, and `yt-analytics.readonly`; Google Ads uses the `adwords` scope.
- LinkedIn: OpenID profile/email and `w_member_social`.

The workspace discovers selectable Pages, professional Instagram accounts, YouTube channels, and LinkedIn profiles after authorization. Admin-assigned media is uploaded to `Backend/uploads/marketing`; Meta publishing needs a public HTTPS `BACKEND_PUBLIC_URL` so Meta can fetch that media. Instagram image Posts and Reels, Facebook Page posts, YouTube videos/Shorts, and LinkedIn text/image Posts have publishing adapters. Scheduled posts are processed by the backend worker and visible statuses/errors return to the user's content list.

Provider approval, granted permissions, public HTTPS hosting, media format limits, and account eligibility still apply. Unverified YouTube API projects can have uploads restricted to private until audited. Google Ads API calls additionally require a Google Ads developer token; the Ads account connection alone does not create campaigns. LinkedIn video publishing is not enabled, and full LinkedIn member post analytics are unavailable without restricted approved access.

Admin / Web / Marketing / Users can fetch per-post provider metrics for published items. Instagram and Facebook insights require Meta review and granted insights permissions; YouTube view/comment counts use the Data API and reach is not provided by that API. LinkedIn member post analytics is restricted and is shown as unavailable unless the connected app has the required approved access. Users must reconnect after scopes are changed so the provider can grant the new permissions.
