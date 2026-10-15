import { db } from '@/db';
import { adPlacements } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { readAdConfig, type AdPlacementId } from '@/lib/ads';
import { AdSlot } from './AdSlot';
// Axono-inspired named placement + centralized eligibility, without its creative UI.
export async function PromotionPlacement({ id }: { id: AdPlacementId }) {
  const config = readAdConfig({
    NEXT_PUBLIC_ADSENSE_MODE: process.env.NEXT_PUBLIC_ADSENSE_MODE,
    NEXT_PUBLIC_ADSENSE_CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    NEXT_PUBLIC_ADSENSE_SLOT_ID: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID,
    NEXT_PUBLIC_ADSENSE_SCRIPT_URL: process.env.NEXT_PUBLIC_ADSENSE_SCRIPT_URL,
  });
  if (config.mode === 'off') return null; // no DB/ad/network work in default mode
  try {
    const [placement] = await db.select().from(adPlacements).where(eq(adPlacements.id,id)).limit(1);
    if (!placement?.enabled) return null;
  } catch { return null; } // monetization failure never blocks play
  return <AdSlot id={id} config={config} />;
}
