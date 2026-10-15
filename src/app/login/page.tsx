"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/term";
import { usePlayerName } from "@/lib/player";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setName] = usePlayerName();

  useEffect(() => {
    setMode(params.get("mode") === "register" ? "register" : "login");
  }, [params]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(d.error ?? "failed");
    setName(d.user.username);
    router.push("/account");
    router.refresh();
  }

  return (
    <form className="box mt-4" onSubmit={submit}>
      <p className="dim text-sm">
        <button type="button" className={`btn ${mode === "login" ? "on" : ""}`} onClick={() => setMode("login")}>login</button>{" "}
        <button type="button" className={`btn ${mode === "register" ? "on" : ""}`} onClick={() => setMode("register")}>create account</button>
      </p>
      <p className="mt-3 text-sm">
        <span className="dim">name:</span>{" "}
        <input className="inp w-56" value={user} onChange={(e) => setUser(e.target.value.toLowerCase().replace(/\s/g, ""))} maxLength={20} autoComplete="username" />
      </p>
      <p className="mt-2 text-sm">
        <span className="dim">password:</span>{" "}
        <input className="inp w-56" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </p>
      <p className="dim mt-2 text-xs">
        name: 3-20 chars, a-z 0-9 _ . - &nbsp;·&nbsp; password: 6+ chars.
      </p>
      <div className="mt-3 flex gap-2">
        <button className="btn" disabled={busy || !user || !pass}>{mode === "login" ? "login" : "create + login"}</button>
        <Link href="/" className="btn">cancel</Link>
      </div>
      {err && <p className="mt-3">! {err}</p>}
      <p className="dim mt-3 text-xs">
        you can play everything as a guest. an account only adds server-side score tracking, a rank and a profile page.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Shell path="/login" title="accounts" help="log in to keep your scores on this server.">
      <Suspense fallback={<p>loading form...</p>}>
        <Form />
      </Suspense>
    </Shell>
  );
}
