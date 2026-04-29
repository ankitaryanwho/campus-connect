// Field whitelists for user objects returned in API responses.
// Keeps payloads lean by omitting internal flags and rarely-used columns.

export function pickPublicUser(user: any) {
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
    role: user.role ?? null,
    banned: user.banned ?? false,
  };
}

export function pickConversationUser(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar ?? null,
    college: user.college ?? null,
    program: user.program ?? null,
  };
}

export function pickFullUser(user: any) {
  if (!user) return null;
  const { passwordHash: _, ...rest } = user;
  return rest;
}
