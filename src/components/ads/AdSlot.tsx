'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type AdConfig } from '@/lib/ads';
import { setAdvertisingConsent, subscribeToAdvertisingConsent, getAdvertisingConsent, getServerAdvertisingConsent } from '@/lib/ad-consent';
declare global { interface Window { adsbygoogle?: { push: (value: Record<string, never>) => unknown }; } }
let loading: Promise<void> | null = null;
function loadScript(config: AdConfig) {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const url = new URL(config.scriptUrl); url.searchParams.set('client',config.clientId);
    script.src=url.href; script.async=true; script.crossOrigin='anonymous';
    script.id='ttyarcade-adsense';
    const timeout=setTimeout(() => { script.remove(); reject(new Error('ad load timeout')); }, 10000);
    script.onload=() => { clearTimeout(timeout); resolve(); };
    script.onerror=() => { clearTimeout(timeout); script.remove(); reject(new Error('ad blocked')); };
    document.head.appendChild(script);
  });
  return loading;
}
export function AdSlot({id,config}: {id: string; config: AdConfig}) {
  const consent=useSyncExternalStore(subscribeToAdvertisingConsent,getAdvertisingConsent,getServerAdvertisingConsent);
  const slot=useRef<HTMLModElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(() => {
    // CMP integration may alternatively dispatch this same-page event.
    const onConsent=(event: Event) => setAdvertisingConsent((event as CustomEvent).detail?.granted === true);
    window.addEventListener('ttyarcade-ad-consent',onConsent);
    setAdvertisingConsent(window.ttyarcadeAdvertisingConsent === true);
    return () => window.removeEventListener('ttyarcade-ad-consent',onConsent);
  },[]);
  useEffect(() => {
    if (config.mode !== 'live' || !consent) return;
    let active=true;
    void loadScript(config).then(() => {
      const element=slot.current;
      if (!active || !getAdvertisingConsent() || !element || element.dataset.requested) return;
      element.dataset.requested='true';
      // Never fabricate an impression/click, repeatedly refresh an ad, or edit creatives.
      (window.adsbygoogle ??= [] as Record<string, never>[]).push({});
    }).catch(() => { if (active) setFailed(true); });
    return () => { active=false; };
  },[config,consent]);
  return <aside aria-label="Sponsored placement" data-ad-placement={id} className="box-dashed mt-8 text-sm" style={{minHeight:140, contain:'layout', overflow:'auto'}}>
    <p className="dim">[ sponsored ]</p>
    {config.mode === 'placeholder' ? <p>advertising placeholder — no ads or tracking loaded</p> : !consent ? <p>advertising paused — awaiting consent</p> : failed ? <p>advertising unavailable — gameplay is unaffected</p> : <ins ref={slot} className="adsbygoogle" style={{display:'block',width:'100%',height:100}} data-ad-client={config.clientId} data-ad-slot={config.slotId} />}
  </aside>;
}
