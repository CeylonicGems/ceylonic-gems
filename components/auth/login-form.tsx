"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const searchParams = useSearchParams();
  const intended = searchParams.get("role") ?? "account";
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const compatible =
        intended === "account" ||
        profile?.role === intended ||
        (intended === "buyer" && profile?.role === "both") ||
        (intended === "seller" && profile?.role === "both");

      if (!compatible) {
        await supabase.auth.signOut();
        throw new Error(
          intended === "admin"
            ? "This account does not have owner/admin access."
            : `This is not a ${intended} account.`
        );
      }

      location.assign(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form-panel auth-form" onSubmit={submit}>
      <span className="eyebrow">{intended.toUpperCase()} LOGIN</span>
      <h1>Welcome back.</h1>
      <p>Sign in securely to continue to your Ceylonic Gems workspace.</p>

      <label>
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <Link className="text-link" href="/forgot-password">Forgot your password?</Link>
      {message && <div className="notice">{message}</div>}
      <button className="button primary" type="submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
