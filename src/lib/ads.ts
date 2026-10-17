export const AD_PLACEMENTS = ['home-footer', 'leaderboard-footer'] as const;
export type AdPlacementId = typeof AD_PLACEMENTS[number];
export type AdConfig = { mode: 'off' | 'placeholder' | 'live'; clientId: string; slotId: string; scriptUrl: string };
const GOOGLE_SCRIPT = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
export function readAdConfig(env: Record<string, string | undefined>): AdConfig {
  const mode = env.NEXT_PUBLIC_ADSENSE_MODE === 'live' ? 'live' : env.NEXT_PUBLIC_ADSENSE_MODE === 'placeholder' ? 'placeholder' : 'off';
  const clientId = env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? '';
  const slotId = env.NEXT_PUBLIC_ADSENSE_SLOT_ID ?? '';
  const scriptUrl = env.NEXT_PUBLIC_ADSENSE_SCRIPT_URL || GOOGLE_SCRIPT;
  // Environment configuration is not permission to execute arbitrary scripts.
  let allowed = false;
  try { const url = new URL(scriptUrl); allowed = url.origin === 'https://pagead2.googlesyndication.com' && url.pathname === '/pagead/js/adsbygoogle.js' && !url.username && !url.password && !url.hash && !url.search; } catch { /* fail closed */ }
  const valid = /^ca-pub-\d{16}$/.test(clientId) && /^\d{10}$/.test(slotId) && allowed;
  return { mode: mode === 'live' && !valid ? 'off' : mode, clientId, slotId, scriptUrl: allowed ? scriptUrl : GOOGLE_SCRIPT };
}
