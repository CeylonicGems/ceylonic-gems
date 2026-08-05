import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayHereButton } from "@/components/payhere-button";
import { SellerOfferActions } from "@/components/seller-offer-actions";

export default async function SellerDashboard() {
  const { user, profile } = await requireRole(["seller", "both"]);
  const supabase = await createClient();

  const [{ data: gems }, { data: offers }, { data: transactions }] = await Promise.all([
    supabase
      .from("gems")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("offers")
      .select("*,gem:gems!inner(id,name,seller_id)")
      .eq("gem.seller_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("*,gem:gems(name),buyer:profiles!transactions_buyer_id_fkey(display_name)")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  return (
    <section className="section top-section">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">SELLER DASHBOARD</span>
          <h1>{profile.display_name}</h1>
        </div>
        <div className="row start">
          {profile.verification_status !== "verified" && (
            <Link className="button ghost" href="/verification">
              Complete Verification
            </Link>
          )}
          <Link className="button primary" href="/submit-gem">
            Submit a Gemstone
          </Link>
        </div>
      </div>

      <div className="dashboard-stats">
        <article><span>Verification</span><strong>{profile.verification_status}</strong></article>
        <article><span>Total listings</span><strong>{gems?.length ?? 0}</strong></article>
        <article><span>Published</span><strong>{gems?.filter((gem) => gem.status === "published").length ?? 0}</strong></article>
        <article><span>Active offers</span><strong>{offers?.length ?? 0}</strong></article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="row">
            <h2>Buyer offers</h2>
            <span>Accepting creates a payment transaction</span>
          </div>
          <div className="list">
            {offers?.length ? (
              offers.map((offer: any) => (
                <article className="admin-card" key={offer.id}>
                  <div className="row">
                    <div>
                      <strong>{offer.gem?.name ?? "Gemstone"}</strong>
                      <small>{offer.buyer_alias}</small>
                    </div>
                    <strong>{offer.currency} {Number(offer.amount).toLocaleString()}</strong>
                  </div>
                  <SellerOfferActions offerId={offer.id} />
                </article>
              ))
            ) : (
              <div className="empty-state">No active buyer offers.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Sale transactions</h2>
          <div className="list">
            {transactions?.length ? (
              transactions.map((transaction: any) => (
                <article className="list-row" key={transaction.id}>
                  <div>
                    <strong>{transaction.gem?.name ?? "Gemstone sale"}</strong>
                    <small>{transaction.status} · buyer payment {transaction.payment_status}</small>
                  </div>
                  <div>
                    <strong>{transaction.currency} {Number(transaction.amount).toLocaleString()}</strong>
                    <small>Platform fee: {transaction.currency} {Number(transaction.success_fee_amount).toLocaleString()}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No accepted-sale transactions.</div>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="row">
          <h2>My gemstone listings</h2>
          <span>1% success fee after sale</span>
        </div>
        <div className="list">
          {gems?.length ? (
            gems.map((gem: any) => (
              <article className="list-row seller-listing" key={gem.id}>
                <div>
                  <strong>{gem.name}</strong>
                  <small>{gem.carat} ct · {gem.currency} {Number(gem.price).toLocaleString()}</small>
                </div>
                <div>
                  <span className="pill">{gem.status}</span>{" "}
                  <span className="pill">Payment: {gem.payment_status}</span>
                </div>
                {gem.payment_status !== "paid" && (
                  <PayHereButton purpose="listing_fee" referenceId={gem.id} label="Pay LKR 500" />
                )}
              </article>
            ))
          ) : (
            <div className="empty-state">No gemstone submissions yet.</div>
          )}
        </div>
      </section>
    </section>
  );
}
