"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/confirm?next=/reset-password`
    });
    setMessage(error ? error.message : "Check your email for the secure password-reset link.");
    setBusy(false);
  }

  return (
    <section className="auth-page">
      <form className="panel form-panel auth-form" onSubmit={submit}>
        <span className="eyebrow">PASSWORD RECOVERY</span>
        <h1>Reset your password.</h1>
        <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {message && <div className="notice">{message}</div>}
        <button className="button primary" disabled={busy}>{busy ? "Sending…" : "Send Reset Link"}</button>
      </form>
    </section>
  );
}
