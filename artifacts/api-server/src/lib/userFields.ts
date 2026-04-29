// Field whitelists for user objects returned in API responses.
// Keeps payloads lean by omitting internal flags and rarely-used columns.

// For post authors and comment authors — the full public display shape.
// Matches spec: id, name, avatar, college, program, year, verified,
// verificationBadge, gender, isAnonymous.
export function pickPublicUser(user: any): any {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? null,
    college: user.college ?? null,
    program: user.program ?? null,
    year: user.year ?? null,
    gender: user.gender ?? null,
    verified: user.verified ?? false,
    verificationBadge: user.verificationBadge ?? null,
    isAnonymous: false,
  };
}

// For conversation participant lists — smaller shape for chat list items.
// Matches spec: id, name, avatar, college, program.
export function pickConversationUser(user: any): any {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? null,
    college: user.college ?? null,
    program: user.program ?? null,
  };
}

// For the profile page — full user data minus passwordHash.
export function pickFullUser(user: any): any {
  if (!user) return null;
  const { passwordHash: _, ...rest } = user;
  return rest;
}
