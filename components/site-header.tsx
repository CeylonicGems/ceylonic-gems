"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SiteHeader() {
  const [signed, setSigned] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSigned(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSigned(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function out() {
    await createClient().auth.signOut();
    location.assign("/");
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">◆</span>
        <span>Ceylonic Gems</span>
      </Link>

      <button
        className="mobile-menu"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open menu"
      >
        ☰
      </button>

      <nav className={open ? "main-nav open" : "main-nav"}>
  <Link href="/#lobby" onClick={() => setOpen(false)}>
    Gem Lobby
  </Link>

  <Link href="/gems" onClick={() => setOpen(false)}>
    Our Gems
  </Link>

  <Link href="/appointment" onClick={() => setOpen(false)}>
    Book Appointment
  </Link>

  <Link href="/#about" onClick={() => setOpen(false)}>
    About
  </Link>

  <Link href="/#contact" onClick={() => setOpen(false)}>
    Contact
  </Link>

  {signed && (
    <Link
      className="mobile-dashboard-link"
      href="/dashboard"
      onClick={() => setOpen(false)}
    >
      Dashboard
    </Link>
  )}
</nav>

      <div className="header-actions">
        {signed ? (
          <>
            <Link className="button ghost compact" href="/dashboard">
              Dashboard
            </Link>

            <button
              className="button primary compact"
              onClick={out}
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link className="button primary compact" href="/login">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}