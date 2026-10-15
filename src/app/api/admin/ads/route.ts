import { apiHandler, readJson } from '@/lib/http';
import { currentUser } from '@/lib/auth';
import { db } from '@/db';
import { adPlacements } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { AD_PLACEMENTS, readAdConfig } from '@/lib/ads';
export const dynamic='force-dynamic';
export const GET=apiHandler(async()=>{
 if (!(await currentUser())?.isAdmin)return Response.json({error:'admin only'},{status:403});
 const placements=await db.select().from(adPlacements).orderBy(asc(adPlacements.id));
 const config=readAdConfig({
  NEXT_PUBLIC_ADSENSE_MODE:process.env.NEXT_PUBLIC_ADSENSE_MODE,
  NEXT_PUBLIC_ADSENSE_CLIENT_ID:process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  NEXT_PUBLIC_ADSENSE_SLOT_ID:process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID,
  NEXT_PUBLIC_ADSENSE_SCRIPT_URL:process.env.NEXT_PUBLIC_ADSENSE_SCRIPT_URL,
 });
 return Response.json({placements,mode:config.mode,requestedMode:process.env.NEXT_PUBLIC_ADSENSE_MODE??'off',clientId:config.clientId,slotId:config.slotId});
});
export const POST=apiHandler(async req=>{
 if (!(await currentUser())?.isAdmin)return Response.json({error:'admin only'},{status:403});
 const {id,enabled}=await readJson(req);
 if(!AD_PLACEMENTS.some(p=>p===id)||typeof enabled!=='boolean')return Response.json({error:'valid placement id and boolean enabled required'},{status:400});
 const updated=await db.update(adPlacements).set({enabled,updatedAt:new Date()}).where(eq(adPlacements.id,id as string)).returning();
 if(!updated.length)return Response.json({error:'placement missing; apply SQL migrations'},{status:404});
 return Response.json({ok:true,placement:updated[0]});
});
