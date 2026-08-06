import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

    const admin = createAdminClient();
    const [{ data: media }, { data: certificates }] = await Promise.all([
      admin.from("gem_media").select("id,path,media_type,sort_order").eq("gem_id", id).order("sort_order"),
      admin.from("gem_certificates").select("id,path,status,laboratory,certificate_number").eq("gem_id", id)
    ]);

    const signedMedia = await Promise.all(
  (media ?? []).map(async (item, index) => {
    const { data, error } = await admin.storage
      .from("gem-media")
      .createSignedUrl(item.path, 300);

    if (error || !data?.signedUrl) {
      throw error ?? new Error("Gemstone media link failed.");
    }

    return {
      label: `${item.media_type} ${index + 1}`,
      url: data.signedUrl,
      type: item.media_type,
    };
  })
);

    const privateCertificates = await Promise.all((certificates ?? []).map(async (certificate) => {
      const { data, error } = await admin.storage.from("certificates-private").createSignedUrl(certificate.path, 300);
      if (error || !data?.signedUrl) throw error ?? new Error("Certificate link failed.");
      return {
        label: certificate.laboratory || certificate.certificate_number || "Certificate",
        url: data.signedUrl,
        type: "certificate"
      };
    }));

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "listing_files_viewed",
      entity_type: "gem",
      entity_id: id,
      details: {
  media_count: signedMedia.length,
  certificate_count: privateCertificates.length,
});

    return NextResponse.json({
  files: [...signedMedia, ...privateCertificates],
});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to review listing files." }, { status: 500 });
  }
}
