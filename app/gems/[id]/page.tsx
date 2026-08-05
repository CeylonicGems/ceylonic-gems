import { notFound } from "next/navigation";
import Link from "next/link";
import { getGemById } from "@/lib/data";
import { OfferPanel } from "@/components/offer-panel";
import { VotePanel } from "@/components/vote-panel";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "LKR" ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default async function GemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gem = await getGemById(id);
  if (!gem) notFound();

  const details = [
    ["Variety", gem.variety ?? "Not stated"],
    ["Origin", gem.origin ?? "Not stated"],
    ["Weight", `${gem.carat} carats`],
    ["Cut", gem.cut ?? "Not stated"],
    ["Colour", gem.color ?? "Not stated"],
    ["Clarity", gem.clarity ?? "Not stated"],
    ["Treatment", gem.treatment ?? "Not stated"],
    ["Dimensions", gem.dimensions ?? "Not stated"]
  ];

  return (
    <section className="section top-section">
      <Link className="back-link" href="/gems">← Back to Gem Display</Link>
      <article className="profile-shell">
        <div className="profile-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gem.cover_image_path ?? "/gems/approved-gem.svg"} alt={gem.name} />
        </div>

        <div className="profile-header">
          <div>
            <div className="pill-row">
              <span className="pill verified">Verified Seller</span>
              <span className="pill">{gem.availability}</span>
              <span className="pill">Certificate: {gem.certificate_status}</span>
            </div>
            <h1>{gem.name}</h1>
            <p>{gem.seller_name ?? "Verified Seller"} · Listing {gem.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="profile-price">
            <span>Asking price</span>
            <strong>{money(gem.price, gem.currency)}</strong>
          </div>
        </div>

        <div className="profile-actions">
          <a className="button primary" href="#offers">Make an Offer</a>
          <Link className="button ghost" href={`/appointment?gem=${gem.id}`}>Book Appointment</Link>
          <Link className="button ghost" href={`/appointment?gem=${gem.id}&type=international`}>International Request</Link>
        </div>

        <div className="profile-grid">
          <section className="panel">
            <h2>Gemstone profile</h2>
            <p>{gem.description}</p>
            <div className="detail-grid">
              {details.map(([label, value]) => (
                <div className="detail-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <VotePanel gemId={gem.id} initialRating={gem.rating ?? null} initialTotal={gem.vote_total ?? 0} />
        </div>

        {gem.media && gem.media.length > 0 && (
          <section className="media-gallery panel">
            <span className="eyebrow">MEDIA GALLERY</span>
            <h2>Photographs and video</h2>
            <div className="media-grid">
              {gem.media.map((item) =>
                item.media_type === "video" ? (
                  <video key={item.id} controls preload="metadata" src={item.url} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={item.id} src={item.url} alt={`${gem.name} gemstone view`} />
                )
              )}
            </div>
          </section>
        )}

        <div id="offers">
          <OfferPanel gemId={gem.id} gemName={gem.name} initialOffers={gem.offers ?? []} />
        </div>
      </article>
    </section>
  );
}
