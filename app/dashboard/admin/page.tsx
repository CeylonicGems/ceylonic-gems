import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminListingActions } from "@/components/admin-actions";
import { AdminVerificationActions } from "@/components/admin-verification-actions";
import { AdminAppointmentActions } from "@/components/admin-appointment-actions";

export default async function AdminDashboard() {
  await requireRole(["admin"]);
  const supabase = await createClient();

  const [
    { data: gems },
    { data: verifications },
    { count: users },
    { count: published },
    { data: payments },
    { data: appointments },
    { data: transactions }
  ] = await Promise.all([
    supabase
      .from("gems")
      .select("*,seller:profiles!gems_seller_id_fkey(display_name,verification_status)")
      .in("status", ["payment_pending", "pending", "changes_requested"])
      .order("created_at", { ascending: false }),
    supabase
      .from("identity_verifications")
      .select("*,profile:profiles(display_name,role,citizenship)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("gems").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(10),
    supabase
      .from("appointments")
      .select("*,buyer:profiles!appointments_buyer_id_fkey(display_name),gem:gems(name)")
      .in("status", ["pending", "approved", "rescheduled"])
      .order("preferred_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("*,gem:gems(name),buyer:profiles!transactions_buyer_id_fkey(display_name),seller:profiles!transactions_seller_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  return (
    <section className="section top-section">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">OWNER / ADMIN</span>
          <h1>Ceylonic Control Centre</h1>
        </div>
        <span className="pill verified">Protected Admin Interface</span>
      </div>

      <div className="dashboard-stats">
        <article><span>Registered users</span><strong>{users ?? 0}</strong></article>
        <article><span>Pending identities</span><strong>{verifications?.length ?? 0}</strong></article>
        <article><span>Pending listings</span><strong>{gems?.length ?? 0}</strong></article>
        <article><span>Published gems</span><strong>{published ?? 0}</strong></article>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Gemstone approvals</h2>
          <div className="list">
            {gems?.length ? (
              gems.map((gem: any) => (
                <article className="admin-card" key={gem.id}>
                  <div className="row">
                    <div>
                      <strong>{gem.name}</strong>
                      <small>{gem.seller?.display_name ?? "Seller"} · {gem.carat} ct</small>
                    </div>
                    <span className="pill">{gem.status}</span>
                  </div>
                  <p>{gem.description}</p>
                  <div className="muted-row">
                    <span>{gem.currency} {Number(gem.price).toLocaleString()}</span>
                    <span>Fee: {gem.payment_status}</span>
                    <span>Seller: {gem.seller?.verification_status}</span>
                  </div>
                  <AdminListingActions listingId={gem.id} paymentStatus={gem.payment_status} />
                </article>
              ))
            ) : (
              <div className="empty-state">No pending gemstone approvals.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Identity verification</h2>
          <div className="list">
            {verifications?.length ? (
              verifications.map((verification: any) => (
                <article className="admin-card" key={verification.id}>
                  <div>
                    <strong>{verification.profile?.display_name ?? "Account"}</strong>
                    <small>
                      {verification.profile?.role} · {verification.document_type} · ending {verification.document_number_last4}
                    </small>
                  </div>
                  <p>Identity links are private, audited and expire after five minutes.</p>
                  <AdminVerificationActions verificationId={verification.id} />
                </article>
              ))
            ) : (
              <div className="empty-state">No identity reviews waiting.</div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Appointment administration</h2>
          <div className="list">
            {appointments?.length ? (
              appointments.map((appointment: any) => (
                <article className="admin-card" key={appointment.id}>
                  <div className="row">
                    <div>
                      <strong>{appointment.gem?.name ?? appointment.appointment_type}</strong>
                      <small>{appointment.buyer?.display_name ?? "Buyer"} · {appointment.status}</small>
                    </div>
                    <span>{new Date(appointment.preferred_at).toLocaleString()}</span>
                  </div>
                  {appointment.notes && <p>{appointment.notes}</p>}
                  <AdminAppointmentActions appointmentId={appointment.id} />
                </article>
              ))
            ) : (
              <div className="empty-state">No appointments require administration.</div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Marketplace transactions</h2>
          <div className="list">
            {transactions?.length ? (
              transactions.map((transaction: any) => (
                <article className="list-row" key={transaction.id}>
                  <div>
                    <strong>{transaction.gem?.name ?? "Gemstone"}</strong>
                    <small>
                      {transaction.buyer?.display_name ?? "Buyer"} → {transaction.seller?.display_name ?? "Seller"} · {transaction.status}
                    </small>
                  </div>
                  <div>
                    <strong>{transaction.currency} {Number(transaction.amount).toLocaleString()}</strong>
                    <small>Fee {transaction.currency} {Number(transaction.success_fee_amount).toLocaleString()} · payment {transaction.payment_status}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No transactions recorded.</div>
            )}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Recent payment ledger</h2>
        <div className="list">
          {payments?.length ? (
            payments.map((payment: any) => (
              <article className="list-row" key={payment.id}>
                <div>
                  <strong>{payment.order_id}</strong>
                  <small>{payment.purpose} · {payment.status}</small>
                </div>
                <strong>{payment.currency} {Number(payment.amount).toLocaleString()}</strong>
              </article>
            ))
          ) : (
            <div className="empty-state">No payment records.</div>
          )}
        </div>
      </section>
    </section>
  );
}
