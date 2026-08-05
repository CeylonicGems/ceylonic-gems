import { demoGems } from "@/data/demo";
import { createClient } from "@/lib/supabase/server";
import type { Gem, PublicOffer } from "@/types";

type GemRatingResult = {
  rating: number | string | null;
  vote_total: number | string;
};

function mediaUrl(path: string | null) {
  if (!path) return "/gems/approved-gem.svg";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base
    ? `${base}/storage/v1/object/public/gem-media/${path}`
    : "/gems/approved-gem.svg";
}

export async function getPublishedGems(): Promise<Gem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return demoGems;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gems")
      .select("*,seller:profiles!gems_seller_id_fkey(display_name)")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error || !data?.length) return demoGems;
    return data.map((row: any) => ({
      ...row,
      seller_name: row.seller?.display_name ?? "Verified Seller",
      cover_image_path: mediaUrl(row.cover_image_path)
    })) as Gem[];
  } catch {
    return demoGems;
  }
}

export async function getGemById(id: string): Promise<Gem | null> {
  const demo = demoGems.find((gem) => gem.id === id);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return demo ?? null;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("gems")
      .select("*,seller:profiles!gems_seller_id_fkey(display_name),media:gem_media(id,path,media_type,sort_order)")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) return demo ?? null;

    const [{ data: offers }, { data: rating }] = await Promise.all([
      supabase
        .from("gem_public_offers")
        .select("*")
        .eq("gem_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.rpc("get_gem_rating", { target_gem: id }).maybeSingle()
    ]);

    const typedRating = rating as GemRatingResult | null;

    return {
      ...data,
      seller_name: data.seller?.display_name ?? "Verified Seller",
      cover_image_path: mediaUrl(data.cover_image_path),
      media: (data.media ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((item: any) => ({ ...item, url: mediaUrl(item.path) })),
      offers: (offers ?? []) as PublicOffer[],
      rating:
        typedRating?.rating == null ? null : Number(typedRating.rating),
      vote_total: Number(typedRating?.vote_total ?? 0)
    } as Gem;
  } catch {
    return demo ?? null;
  }
}
