"use client";
import { useEffect, useState } from "react";
/** Wall clock is sampled outside render; races tick even without room updates. */
export function useClock() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return now;
}
