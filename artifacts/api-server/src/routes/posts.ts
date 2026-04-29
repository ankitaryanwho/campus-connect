import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, likesTable, commentsTable, notificationsTable } from "@workspace/db/schema";
import { eq, desc, lt, and, or, ne, sql, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { pickPublicUser } from "../lib/userFields";

const router = Router();

// ─── Shared Helpers ──────────────────────────────────────────────────────────

async function batchGetUsers(ids: string[]): Promise<Map<string, any>> {
  if (!ids.length) return new Map();
  const uniqueIds = [...new Set(ids)];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, uniqueIds));
  const map = new Map<string, any>();
  for (const u of users) {
    const { passwordHash: _, ...safe } = u;
    map.set(u.id, safe);
  }
  return map;
}

function buildAnonAuthor(realAuthor: any) {
  return {
    id: "anonymous",
    name: "Profile Hidden",
    avatar: null,
    college: null,
    program: realAuthor?.program || null,
    year: realAuthor?.year || null,
    gender: realAuthor?.gender || null,
    verified: false,
    verificationBadge: null,
    isAnonymous: true,
  };
}

// ─── Batch formatter: 2 queries for any number of posts ──────────────────────

async function formatPosts(posts: any[], requestingUserId: string): Promise<any[]> {
  if (!posts.length) return [];

  const authorIds = posts.map(p => p.authorId);
  const postIds = posts.map(p => p.id);

  const [authorsMap, likedSet] = await Promise.all([
    batchGetUsers(authorIds),
    (async () => {
      const likeRows = await db.select({ postId: likesTable.postId })
        .from(likesTable)
        .where(and(inArray(likesTable.postId, postIds), eq(likesTable.userId, requestingUserId)));
      return new Set(likeRows.map(l => l.postId));
    })(),
  ]);

  return posts.map(post => {
    const rawAuthor = authorsMap.get(post.authorId) || null;
    const isOwnPost = post.authorId === requestingUserId;
    const author = (post.isAnonymous && !isOwnPost)
      ? buildAnonAuthor(rawAuthor)
      : pickPublicUser(rawAuthor);
    const parsedMedia: string[] = JSON.parse(post.mediaUrls || "[]");
    const result: any = {
      ...post,
      authorId: undefined,
      author,
      isOwnPost,
      isLiked: likedSet.has(post.id),
    };
    if (parsedMedia.length) result.mediaUrls = parsedMedia;
    else delete result.mediaUrls;
    return result;
  });
}

// Single-post wrapper (still just 2 queries, same batch path)
async function formatPost(post: any, requestingUserId: string) {
  const [formatted] = await formatPosts([post], requestingUserId);
  return formatted;
}

// ─── Visibility filter ────────────────────────────────────────────────────────

function visibilityFilter(userId: string) {
  return or(eq(postsTable.hidden, false), eq(postsTable.authorId, userId));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    let query = db.select().from(postsTable)
      .where(visibilityFilter(userId))
      .orderBy(desc(postsTable.createdAt)).limit(limit + 1);
    if (cursor) {
      const cursorPost = await db.select().from(postsTable).where(eq(postsTable.id, cursor)).limit(1);
      if (cursorPost.length) {
        query = db.select().from(postsTable)
          .where(and(lt(postsTable.createdAt, cursorPost[0].createdAt), visibilityFilter(userId)))
          .orderBy(desc(postsTable.createdAt)).limit(limit + 1);
      }
    }

    const posts = await query;
    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);
    const formattedPosts = await formatPosts(data, userId);

    res.json({ posts: formattedPosts, nextCursor: hasMore ? data[data.length - 1].id : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get posts" });
  }
});

const VALID_CATEGORIES = ["study", "events", "buysell", "social", "confessions"] as const;

router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { content, mediaUrls = [], isAnonymous = false, category = "social" } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }
    if (content.trim().length > 500) {
      res.status(400).json({ error: "ValidationError", message: "Post cannot exceed 500 characters" });
      return;
    }

    const anonBool = Boolean(isAnonymous);
    const resolvedCategory: string = anonBool
      ? "confessions"
      : (VALID_CATEGORIES.includes(category as any) && category !== "all" ? category : "social");

    const postId = generateId();
    await db.insert(postsTable).values({
      id: postId, content: content.trim(), mediaUrls: JSON.stringify(mediaUrls),
      authorId: userId, isAnonymous: anonBool, category: resolvedCategory, likesCount: 0, commentsCount: 0,
    });
    await db.update(usersTable).set({ postsCount: sql`${usersTable.postsCount} + 1` }).where(eq(usersTable.id, userId));

    const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    const formatted = await formatPost(post[0], userId);
    res.status(201).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create post" });
  }
});

router.get("/:postId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!posts.length) {
      res.status(404).json({ error: "NotFound", message: "Post not found" });
      return;
    }
    if (posts[0].hidden && posts[0].authorId !== userId) {
      res.status(404).json({ error: "NotFound", message: "Post not found" });
      return;
    }
    const formatted = await formatPost(posts[0], userId);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get post" });
  }
});

router.patch("/:postId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }
    if (content.trim().length > 500) {
      res.status(400).json({ error: "ValidationError", message: "Post cannot exceed 500 characters" });
      return;
    }
    const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!posts.length || posts[0].authorId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "Cannot edit this post" });
      return;
    }
    await db.update(postsTable)
      .set({ content: content.trim(), editedAt: new Date() })
      .where(eq(postsTable.id, postId));
    const updated = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    const formatted = await formatPost(updated[0], userId);
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to edit post" });
  }
});

router.post("/:postId/hide", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!posts.length || posts[0].authorId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "Cannot hide this post" });
      return;
    }
    await db.update(postsTable).set({ hidden: true }).where(eq(postsTable.id, postId));
    res.json({ success: true, hidden: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to hide post" });
  }
});

router.post("/:postId/unhide", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!posts.length || posts[0].authorId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "Cannot unhide this post" });
      return;
    }
    await db.update(postsTable).set({ hidden: false }).where(eq(postsTable.id, postId));
    res.json({ success: true, hidden: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to unhide post" });
  }
});

router.delete("/:postId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const posts = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!posts.length || posts[0].authorId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "Cannot delete this post" });
      return;
    }
    await db.delete(likesTable).where(eq(likesTable.postId, postId));
    await db.delete(commentsTable).where(eq(commentsTable.postId, postId));
    await db.delete(postsTable).where(eq(postsTable.id, postId));
    await db.update(usersTable).set({ postsCount: sql`${usersTable.postsCount} - 1` }).where(eq(usersTable.id, userId));
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to delete post" });
  }
});

router.post("/:postId/like", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const targetRows = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!targetRows.length || (targetRows[0].hidden && targetRows[0].authorId !== userId)) {
      res.status(404).json({ error: "NotFound", message: "Post not found" });
      return;
    }
    const existing = await db.select().from(likesTable)
      .where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId))).limit(1);

    if (existing.length > 0) {
      await db.delete(likesTable).where(and(eq(likesTable.postId, postId), eq(likesTable.userId, userId)));
      await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} - 1` }).where(eq(postsTable.id, postId));
      const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
      res.json({ liked: false, likesCount: post[0].likesCount });
    } else {
      await db.insert(likesTable).values({ userId, postId });
      await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, postId));
      const post = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);

      if (post.length && post[0].authorId !== userId) {
        const likersMap = await batchGetUsers([userId]);
        const liker = likersMap.get(userId);
        const notifBody = post[0].isAnonymous
          ? "Someone liked your anonymous post"
          : `${liker?.name} liked your post`;
        await db.insert(notificationsTable).values({
          id: generateId(), userId: post[0].authorId, type: "like",
          title: "New Like", body: notifBody,
        });
      }

      res.json({ liked: true, likesCount: post[0].likesCount });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to toggle like" });
  }
});

router.get("/:postId/comments", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;

    const postRows = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    const post = postRows[0];
    if (!post || (post.hidden && post.authorId !== userId)) {
      res.status(404).json({ error: "NotFound", message: "Post not found" });
      return;
    }

    const allComments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    // Batch fetch all comment authors in one query
    const authorIds = allComments.map(c => c.authorId);
    const authorsMap = await batchGetUsers(authorIds);

    const formatted = allComments.map(c => {
      const rawAuthor = authorsMap.get(c.authorId) || null;
      const isOwnComment = c.authorId === userId;
      const isPostAuthor = post && c.authorId === post.authorId;
      const author = (post?.isAnonymous && isPostAuthor && !isOwnComment)
        ? buildAnonAuthor(rawAuthor)
        : pickPublicUser(rawAuthor);
      return { ...c, authorId: undefined, author, isOwnComment, isPostAuthor };
    });

    const topLevel = formatted.filter(c => !c.parentId);
    const replies = formatted.filter(c => c.parentId);
    const threaded = topLevel.map(c => ({
      ...c,
      replies: replies.filter(r => r.parentId === c.id),
    }));

    res.json({ comments: threaded });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get comments" });
  }
});

router.post("/:postId/comments", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
    const { content, parentId } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }

    const postRows = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (!postRows.length || (postRows[0].hidden && postRows[0].authorId !== userId)) {
      res.status(404).json({ error: "NotFound", message: "Post not found" });
      return;
    }

    if (parentId) {
      const parent = await db.select().from(commentsTable).where(eq(commentsTable.id, parentId)).limit(1);
      if (!parent.length || parent[0].postId !== postId) {
        res.status(400).json({ error: "ValidationError", message: "Invalid parent comment" });
        return;
      }
    }

    const commentId = generateId();
    await db.insert(commentsTable).values({
      id: commentId, content: content.trim(), authorId: userId, postId,
      parentId: parentId || null,
    });

    if (!parentId) {
      await db.update(postsTable).set({ commentsCount: sql`${postsTable.commentsCount} + 1` }).where(eq(postsTable.id, postId));
    }

    const post = postRows[0];
    if (post.authorId !== userId) {
      const commentersMap = await batchGetUsers([userId]);
      const commenter = commentersMap.get(userId);
      const notifBody = post.isAnonymous
        ? "Someone commented on your anonymous post"
        : `${commenter?.name} commented on your post`;
      await db.insert(notificationsTable).values({
        id: generateId(), userId: post.authorId, type: "comment",
        title: "New Comment", body: notifBody,
      });
    }

    const comments = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
    const authorsMap = await batchGetUsers([userId]);
    const author = pickPublicUser(authorsMap.get(userId) || null);
    res.status(201).json({ ...comments[0], authorId: undefined, author, replies: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create comment" });
  }
});

export default router;
