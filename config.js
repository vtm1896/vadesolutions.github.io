window.SUPABASE_URL = 'https://xkgfuqufcknrnzcqcvpt.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_pGgBlzR91_qs2wMLdWes6Q_lWzFbKZR';

// Discord channel webhook — alerts fire on status flips, maintenance, license batches.
// Paste a webhook URL from Discord: Channel Settings → Integrations → Webhooks. Leave '' to disable.
window.DISCORD_WEBHOOK_URL = '';

// KeyAuth proxy (Supabase Edge Function) — holds your KeyAuth secret server-side.
// Deploy: supabase functions deploy keyauth-proxy
// Then set the URL to: https://<project-ref>.supabase.co/functions/v1/keyauth-proxy
window.KEYAUTH_PROXY = '';
