import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, followsTable, postsTable } from "@workspace/db/schema";
import { eq, and, desc, sql, or, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

async function safeUser(user: any) {
  const { passwordHash: _, ...u } = user;
  return u;
}

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = (req as any).userId;
    const { userId } = req.params;
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!users.length) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }
    const isFollowingRows = await db.select().from(followsTable)
      .where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, userId))).limit(1);
    const u = await safeUser(users[0]);
    res.json({ ...u, isFollowing: isFollowingRows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get user" });
  }
});

router.post("/:userId/follow", authMiddleware, async (req, res) => {
  try {
    const currentUserId = (req as any).userId;
    const { userId } = req.params;

    if (currentUserId === userId) {
      res.status(400).json({ error: "BadRequest", message: "Cannot follow yourself" });
      return;
    }

    const existing = await db.select().from(followsTable)
      .where(and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, userId))).limit(1);

    if (existing.length > 0) {
      await db.delete(followsTable).where(
        and(eq(followsTable.followerId, currentUserId), eq(followsTable.followingId, userId))
      );
      await db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} - 1` }).where(eq(usersTable.id, userId));
      await db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} - 1` }).where(eq(usersTable.id, currentUserId));
      const target = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      res.json({ following: false, followersCount: target[0].followersCount });
    } else {
      await db.insert(followsTable).values({ followerId: currentUserId, followingId: userId });
      await db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} + 1` }).where(eq(usersTable.id, userId));
      await db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} + 1` }).where(eq(usersTable.id, currentUserId));
      const target = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      res.json({ following: true, followersCount: target[0].followersCount });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to toggle follow" });
  }
});

router.get("/:userId/posts", authMiddleware, async (req, res) => {
  try {
    const requestingUserId = (req as any).userId;
    const { userId } = req.params;
    const isOwnProfile = requestingUserId === userId;

    const whereClause = isOwnProfile
      ? eq(postsTable.authorId, userId)
      : and(eq(postsTable.authorId, userId), eq(postsTable.isAnonymous, false));

    const posts = await db.select().from(postsTable)
      .where(whereClause)
      .orderBy(desc(postsTable.createdAt));
    const formatted = posts.map(p => ({ ...p, mediaUrls: JSON.parse(p.mediaUrls || "[]") }));
    res.json({ posts: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get user posts" });
  }
});

router.put("/me/profile", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { name, bio, college, program, avatar } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (bio !== undefined) update.bio = bio;
    if (college !== undefined) update.college = college;
    if (program !== undefined) update.program = program;
    if (avatar !== undefined) update.avatar = avatar;

    await db.update(usersTable).set(update).where(eq(usersTable.id, userId));
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const u = await safeUser(users[0]);
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to update profile" });
  }
});

export default router;
