// Shared badge metadata for verification/role badges.
// Imported by profile screens, feed cards, post detail and comments
// so the same badge appears next to a user's name everywhere.

export type BadgeKey =
  | "verified"
  | "top_contributor"
  | "campus_leader"
  | "expert"
  | "ambassador"
  | "staff";

export interface BadgeMeta {
  label: string;
  icon: string;
  color: string;
}

export const BADGE_META: Record<string, BadgeMeta> = {
  verified: { label: "Verified", icon: "check-circle", color: "#5B4FE8" },
  top_contributor: { label: "Top Contributor", icon: "star", color: "#F59E0B" },
  campus_leader: { label: "Campus Leader", icon: "award", color: "#8B5CF6" },
  expert: { label: "Expert", icon: "shield", color: "#10B981" },
  ambassador: { label: "Ambassador", icon: "user-check", color: "#3B82F6" },
  staff: { label: "Staff", icon: "briefcase", color: "#EF4444" },
};

// Resolve the badge to display next to a user's name.
// Priority: explicit verificationBadge > legacy `verified=true` (→ "verified" badge).
export function resolveBadge(user: { verificationBadge?: string | null; verified?: boolean } | null | undefined): BadgeMeta | null {
  if (!user) return null;
  if (user.verificationBadge && BADGE_META[user.verificationBadge]) {
    return BADGE_META[user.verificationBadge];
  }
  if (user.verified) return BADGE_META.verified;
  return null;
}
