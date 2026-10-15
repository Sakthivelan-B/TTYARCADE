'use client';
// Bridge only. A real consent platform must call this after its own policy checks.
// Not persisted: a CMP must re-establish consent on each document load.
declare global { interface Window { ttyarcadeAdvertisingConsent?: boolean; } }
let granted = false;
const subscribers = new Set<() => void>();
export function setAdvertisingConsent(value: boolean) {
  granted = value === true;
  if (typeof window !== "undefined") window.ttyarcadeAdvertisingConsent = granted;
  subscribers.forEach(fn => fn());
}
export const subscribeToAdvertisingConsent = (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn); }; };
export const getAdvertisingConsent = () => typeof window !== "undefined" ? window.ttyarcadeAdvertisingConsent === true : granted;
export const getServerAdvertisingConsent = () => false;
