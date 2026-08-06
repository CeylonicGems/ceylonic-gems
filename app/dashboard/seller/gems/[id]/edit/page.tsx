import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SellerEditForm } from "@/components/seller-edit-form";

export default async function EditGemstonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { user } = await requireRole([
    "seller",
    "both",
  ]);

  const supabase = await createClient();

  const { data: gem, error } = await supabase
    .from("gems")
    .select(`
      id,
      seller_id,
      name,
      gem_type,
      variety,
      origin,
      carat,
      price,
      currency,
      treatment,
      clarity,
      cut,
      color,
      dimensions,
      description,
      status,
      deletion_requested
    `)
    .eq("id", id)
    .eq("seller_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!gem) {
    notFound();
  }

  if (gem.deletion_requested) {
    redirect("/dashboard/seller");
  }

  return (
    <section className="section top-section">
      <SellerEditForm gem={gem} />
    </section>
  );
}