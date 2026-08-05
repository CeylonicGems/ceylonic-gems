import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayHereNotification } from "@/lib/payhere";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const merchantId = String(form.get("merchant_id") ?? "");
    const orderId = String(form.get("order_id") ?? "");
    const amount = String(form.get("payhere_amount") ?? "");
    const currency = String(form.get("payhere_currency") ?? "");
    const statusCode = String(form.get("status_code") ?? "");
    const signature = String(form.get("md5sig") ?? "");
    const providerPaymentId = String(form.get("payment_id") ?? "");
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const configuredMerchantId = process.env.PAYHERE_MERCHANT_ID;

    if (!merchantSecret || !configuredMerchantId) {
      return new NextResponse("Payment configuration missing", { status: 500 });
    }
    if (merchantId !== configuredMerchantId) {
      return new NextResponse("Merchant mismatch", { status: 400 });
    }

    const valid = verifyPayHereNotification({
      merchantId,
      orderId,
      amount,
      currency,
      statusCode,
      merchantSecret,
      receivedSignature: signature
    });
    if (!valid) return new NextResponse("Invalid signature", { status: 400 });

    const admin = createAdminClient();
    const { data: payment } = await admin.from("payments").select("*").eq("order_id", orderId).single();
    if (!payment) return new NextResponse("Payment not found", { status: 404 });

    if (Number(amount).toFixed(2) !== Number(payment.amount).toFixed(2) || currency !== payment.currency) {
      return new NextResponse("Payment amount or currency mismatch", { status: 400 });
    }

    const paid = statusCode === "2";
    const status = paid
      ? "paid"
      : statusCode === "0"
        ? "pending"
        : statusCode === "-1"
          ? "cancelled"
          : statusCode === "-2"
            ? "failed"
            : statusCode === "-3"
              ? "chargedback"
              : "unknown";

    await admin
      .from("payments")
      .update({
        status,
        provider_payment_id: providerPaymentId || null,
        paid_at: paid ? new Date().toISOString() : null,
        provider_payload: Object.fromEntries(form.entries())
      })
      .eq("id", payment.id);

    if (paid && payment.purpose === "listing_fee") {
      await admin.from("gems").update({ payment_status: "paid", status: "pending" }).eq("id", payment.reference_id);
    }

    if (paid && payment.purpose === "transaction") {
      await admin
        .from("transactions")
        .update({ payment_status: "paid", status: "payment_received" })
        .eq("id", payment.reference_id);
    }

    return new NextResponse("OK", { status: 200 });
  } catch {
    return new NextResponse("Notification processing failed", { status: 500 });
  }
}
