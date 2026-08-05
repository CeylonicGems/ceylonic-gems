import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayHereButton } from "@/components/payhere-button";
import { isPayHereCurrency } from "@/data/currencies";

export default async function BuyerDashboard() {
  const { user, profile } = await requireRole(["buyer", "both"]);
  const supabase = await createClient();

  const [{ data: offers }, { data: appointments }, { data: transactions }] = await Promise.all([
    supabase
      .from("offers")
      .select("*,gem:gems(name)")
      .eq("buyer_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("*,gem:gems(name)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("*,gem:gems(name),seller:profiles!transactions_seller_id_fkey(display_name)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  return (
    <section className="section top-section">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">BUYER DASHBOARD</span>
          <h1>{profile.display_name}</h1>
        </div>
        {profile.verification_status !== "verified" && (
          <Link className="button primary" href="/verification">
            Complete Verification
          </Link>
        )}
      </div>

      <div className="dashboard-stats">
        <article><span>Verification</span><strong>{profile.verification_status}</strong></article>
        <article><span>Offers</span><strong>{offers?.length ?? 0}</strong></article>
        <article><span>Accepted purchases</span><strong>{transactions?.length ?? 0}</strong></article>
        <article><span>Appointments</span><strong>{appointments?.length ?? 0}</strong></article>
      </div>

      <section className="panel purchase-panel">
        <div className="row">
          <div>
            <h2>Accepted purchases and payments</h2>
            <p>Payment is enabled only after a seller accepts your offer.</p>
          </div>
        </div>
        <div className="list">
          {transactions?.length ? (
            transactions.map((transaction: any) => (
              <article className="purchase-row" key={transaction.id}>
                <div>
                  <strong>{transaction.gem?.name ?? "Gemstone purchase"}</strong>
                  <small>
                    Seller: {transaction.seller?.display_name ?? "Verified seller"} · {transaction.status}
                  </small>
                </div>
                <div>
                  <strong>{transaction.currency} {Number(transaction.amount).toLocaleString()}</strong>
                  <small>Payment: {transaction.payment_status}</small>
                </div>
                {transaction.payment_status !== "paid" && isPayHereCurrency(transaction.currency) ? (
                  <PayHereButton
                    purpose="transaction"
                    referenceId={transaction.id}
                    label="Pay Securely"
                  />
                ) : transaction.payment_status === "paid" ? (
                  <span className="pill verified">Payment Confirmed</span>
                ) : (
                  <span className="pill">Admin-assisted payment required</span>
                )}
              </article>
            ))
          ) : (
            <div className="empty-state">No seller-accepted purchases yet.</div>
          )}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="row">
            <h2>My offers</h2>
            <Link className="text-link" href="/gems">Explore gems</Link>
          </div>
          <div className="list">
            {offers?.length ? (
              offers.map((offer: any) => (
                <article className="list-row" key={offer.id}>
                  <div>
                    <strong>{offer.gem?.name ?? "Gemstone"}</strong>
                    <small>{offer.status}</small>
                  </div>
                  <strong>{offer.currency} {Number(offer.amount).toLocaleString()}</strong>
                </article>
              ))
            ) : (
              <div className="empty-state">No active offers.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Appointments</h2>
          <div className="list">
            {appointments?.length ? (
              appointments.map((appointment: any) => (
                <article className="list-row" key={appointment.id}>
                  <div>
                    <strong>{appointment.gem?.name ?? appointment.appointment_type}</strong>
                    <small>{appointment.status}</small>
                  </div>
                  <span>{new Date(appointment.preferred_at).toLocaleDateString()}</span>
                </article>
              ))
            ) : (
              <div className="empty-state">No appointment requests.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
