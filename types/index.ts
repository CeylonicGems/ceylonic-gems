export type UserRole = "buyer" | "seller" | "both" | "admin";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string;
  citizenship: "sri_lankan" | "foreign";
  verification_status: VerificationStatus;
  verified_badge: boolean;
  created_at: string;
};

export type PublicOffer = {
  id: string;
  gem_id: string;
  buyer_alias: string;
  amount: number;
  currency: string;
  created_at: string;
};

export type GemMedia = {
  id: string;
  path: string;
  media_type: "image" | "video";
  sort_order: number;
  url: string;
};

export type Gem = {
  id: string;
  seller_id: string;
  seller_name?: string;
  name: string;
  gem_type: string;
  variety: string | null;
  origin: string | null;
  carat: number;
  price: number;
  currency: string;
  treatment: string | null;
  clarity: string | null;
  cut: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
  cover_image_path: string | null;
  certificate_status: string;
  availability: string;
  status: string;
  payment_status: string;
  listing_fee_lkr: number;
  published_at: string | null;
  created_at: string;
  rating?: number | null;
  vote_total?: number;
  offers?: PublicOffer[];
  media?: GemMedia[];
};
