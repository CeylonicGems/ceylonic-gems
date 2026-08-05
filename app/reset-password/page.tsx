"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    if (password.length < 8 || password !== confirm) {
      setMessage("Passwords must match and contain at least eight characters.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("Password updated. Redirecting to your dashboard.");
      setTimeout(() => location.assign("/dashboard"), 800);
    }
    setBusy(false);
  }

  return (
    <section className="auth-page">
      <form className="panel form-panel auth-form" onSubmit={submit}>
        <span className="eyebrow">NEW PASSWORD</span>
        <h1>Choose a secure password.</h1>
        <label>New password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Confirm password<input type="password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
        {message && <div className="notice">{message}</div>}
        <button className="button primary" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
      </form>
    </section>
  );
}
