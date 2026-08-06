"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GemIconShape =
  | "diamond"
  | "oval"
  | "square"
  | "octagon"
  | "star"
  | "cushion"
  | "emerald"
  | "pear";

const gemCategories: Array<{
  name: string;
  slug: string;
  shape: GemIconShape;
  colourClass: string;
}> = [
  {
    name: "Blue Sapphire",
    slug: "blue-sapphire",
    shape: "diamond",
    colourClass: "gem-blue",
  },
  {
    name: "Yellow Sapphire",
    slug: "yellow-sapphire",
    shape: "oval",
    colourClass: "gem-yellow",
  },
  {
    name: "Spinel",
    slug: "spinel",
    shape: "square",
    colourClass: "gem-pink",
  },
  {
    name: "Ruby",
    slug: "ruby",
    shape: "octagon",
    colourClass: "gem-red",
  },
  {
    name: "Star Sapphire",
    slug: "star-sapphire",
    shape: "star",
    colourClass: "gem-star-blue",
  },
  {
    name: "Pink Sapphire",
    slug: "pink-sapphire",
    shape: "cushion",
    colourClass: "gem-purple",
  },
  {
    name: "Chrysoberyl",
    slug: "chrysoberyl",
    shape: "emerald",
    colourClass: "gem-green",
  },
  {
    name: "Moonstone",
    slug: "moonstone",
    shape: "pear",
    colourClass: "gem-moonstone",
  },
];

function GemCategoryIcon({
  shape,
}: {
  shape: GemIconShape;
}) {
  if (shape === "oval") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <ellipse cx="32" cy="32" rx="19" ry="27" />

        <path d="M32 5 22 17l-5 15 5 15 10 12" />
        <path d="M32 5 42 17l5 15-5 15-10 12" />
        <path d="m22 17 10 8 10-8" />
        <path d="m17 32 15-7 15 7-15 8Z" />
        <path d="m22 47 10-7 10 7" />
      </svg>
    );
  }

  if (shape === "square") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <rect x="10" y="10" width="44" height="44" rx="3" />
        <rect x="18" y="18" width="28" height="28" />
        <path d="m10 10 8 8M54 10l-8 8M10 54l8-8M54 54l-8-8" />
      </svg>
    );
  }

  if (shape === "octagon") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path d="M21 7h22l14 14v22L43 57H21L7 43V21Z" />
        <path d="M24 15h16l9 9v16l-9 9H24l-9-9V24Z" />
        <path d="m21 7 3 8M43 7l-3 8M57 21l-8 3M57 43l-8-3M43 57l-3-8M21 57l3-8M7 43l8-3M7 21l8 3" />
      </svg>
    );
  }

  if (shape === "star") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <ellipse cx="32" cy="32" rx="20" ry="27" />
        <path d="M32 5v54M12 32h40M18 13l28 38M46 13 18 51" />
        <circle cx="32" cy="32" r="7" />
      </svg>
    );
  }

  if (shape === "cushion") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path d="M18 7h28l11 11v28L46 57H18L7 46V18Z" />
        <path d="M22 15h20l7 7v20l-7 7H22l-7-7V22Z" />
        <path d="m18 7 4 8M46 7l-4 8M57 18l-8 4M57 46l-8-4M46 57l-4-8M18 57l4-8M7 46l8-4M7 18l8 4" />
      </svg>
    );
  }

  if (shape === "emerald") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path d="M19 6h26l12 12v28L45 58H19L7 46V18Z" />
        <path d="M22 14h20l7 7v22l-7 7H22l-7-7V21Z" />
        <path d="M22 14v36M42 14v36M15 21h34M15 43h34" />
      </svg>
    );
  }

  if (shape === "pear") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path d="M32 5C27 16 12 26 12 41c0 11 9 18 20 18s20-7 20-18C52 26 37 16 32 5Z" />
        <path d="m32 5-8 24 8 30 8-30Z" />
        <path d="M16 34h32M20 49l12-20 12 20" />
      </svg>
    );
  }

  if (shape === "diamond") {
    return (
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <path d="M14 11h36l10 15-28 33L4 26Z" />
        <path d="m14 11 8 15 10-15 10 15 8-15" />
        <path d="M4 26h56M22 26l10 33 10-33" />
      </svg>
    );
  }

  return null;
}

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
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSigned(Boolean(session));
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function out() {
    await createClient().auth.signOut();
    location.assign("/");
  }

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">◆</span>
          <span>Ceylonic Gems</span>
        </Link>

        <button
          type="button"
          className="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          ☰
        </button>

        <nav
          className={
            open ? "main-nav open" : "main-nav"
          }
        >
          <Link
            href="/#lobby"
            onClick={() => setOpen(false)}
          >
            Gem Lobby
          </Link>

          <Link
            href="/gems"
            onClick={() => setOpen(false)}
          >
            Our Gems
          </Link>

          <Link
            href="/appointment"
            onClick={() => setOpen(false)}
          >
            Book Appointment
          </Link>

          <Link
            href="/#about"
            onClick={() => setOpen(false)}
          >
            About
          </Link>

          <Link
            href="/#contact"
            onClick={() => setOpen(false)}
          >
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
              <Link
                className="button ghost compact"
                href="/dashboard"
              >
                Dashboard
              </Link>

              <button
                type="button"
                className="button primary compact"
                onClick={out}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              className="button primary compact"
              href="/login"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <nav
        className="gem-category-bar"
        aria-label="Gemstone categories"
      >
        <div className="gem-category-track">
          {gemCategories.map((gem) => (
            <Link
              className={`gem-category-item ${gem.colourClass}`}
              href={`/gems?type=${encodeURIComponent(
                gem.name
              )}`}
              key={gem.slug}
            >
              <span className="gem-category-icon">
                <GemCategoryIcon shape={gem.shape} />
              </span>

              <span className="gem-category-name">
                {gem.name}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}