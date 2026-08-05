import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,verification_status")
      .eq("id", user.id)
      .single();

    if (!profile || !["seller", "both"].includes(profile.role)) {
      return NextResponse.json({ error: "Seller account required." }, { status: 403 });
    }
    if (profile.verification_status !== "verified") {
      return NextResponse.json({ error: "Seller verification is required." }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body.action ?? "");
    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid offer action." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: offer } = await admin
      .from("offers")
      .select("*,gem:gems(id,name,seller_id,status)")
      .eq("id", id)
      .single();

    if (!offer || offer.gem?.seller_id !== user.id) {
      return NextResponse.json({ error: "Offer not found." }, { status: 404 });
    }
    if (offer.status !== "active") {
      return NextResponse.json({ error: "This offer is no longer active." }, { status: 409 });
    }

    if (action === "decline") {
      await admin.from("offers").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", id);
      await admin.from("audit_logs").insert({
        actor_id: user.id,
        action: "offer_declined",
        entity_type: "offer",
        entity_id: id,
        details: { gem_id: offer.gem_id }
      });
      return NextResponse.json({ ok: true });
    }

    if (offer.gem.status !== "published") {
      return NextResponse.json({ error: "The gemstone is not available for acceptance." }, { status: 409 });
    }

    const successFeePercent = Number(process.env.SUCCESS_FEE_PERCENT ?? 1);
    const { data: existing } = await admin
      .from("transactions")
      .select("id")
      .eq("accepted_offer_id", id)
      .maybeSingle();

    if (existing) return NextResponse.json({ transactionId: existing.id });

    const { data: transaction, error: transactionError } = await admin
      .from("transactions")
      .insert({
        gem_id: offer.gem_id,
        buyer_id: offer.buyer_id,
        seller_id: user.id,
        accepted_offer_id: id,
        amount: offer.amount,
        currency: offer.currency,
        success_fee_percent: successFeePercent,
        payment_status: "unpaid",
        status: "awaiting_payment"
      })
      .select("id")
      .single();

    if (transactionError) throw transactionError;

    await Promise.all([
      admin.from("offers").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", id),
      admin.from("offers").update({ status: "declined", updated_at: new Date().toISOString() }).eq("gem_id", offer.gem_id).neq("id", id).eq("status", "active"),
      admin.from("gems").update({ status: "reserved", availability: "Reserved" }).eq("id", offer.gem_id),
      admin.from("audit_logs").insert({
        actor_id: user.id,
        action: "offer_accepted",
        entity_type: "offer",
        entity_id: id,
        details: { gem_id: offer.gem_id, transaction_id: transaction.id }
      })
    ]);

    return NextResponse.json({ transactionId: transaction.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Offer action failed." },
      { status: 500 }
    );
  }
}
