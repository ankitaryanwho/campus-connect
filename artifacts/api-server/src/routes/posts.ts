import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, usersTable, likesTable, commentsTable, notificationsTable } from "@workspace/db/schema";
import { eq, desc, lt, and, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

async function getAuthor(authorId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.id, authorId)).limit(1);
  if (!users.length) return null;
  const { passwordHash: _, ...u } = users[0];
  return u;
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
    isAnonymous: true,
  };
}

async function formatPost(post: any, requestingUserId: string) {
  const realAuthor = await getAuthor(post.authorId);
  const likeRows = await db.select().from(likesTable)
    .where(and(eq(likesTable.postId, post.id), eq(likesTable.userId, requestingUserId))).limit(1);

  const isOwnPost = post.authorId === requestingUserId;
  let author: any;
  if (post.isAnonymous && !isOwnPost) {
    author = buildAnonAuthor(realAuthor);
  } else {
    author = realAuthor;
  }

  return {
    ...post,
    authorId: undefined,
    mediaUrls: JSON.parse(post.mediaUrls || "[]"),
    author,
    isOwnPost,
    isLiked: likeRows.length > 0,
  };
}

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;

    let query = db.select().from(postsTable).orderBy(desc(postsTable.createdAt)).limit(limit + 1);
    if (cursor) {
      const cursorPost = await db.select().from(postsTable).where(eq(postsTable.id, cursor)).limit(1);
      if (cursorPost.length) {
        query = db.select().from(postsTable)
          .where(lt(postsTable.createdAt, cursorPost[0].createdAt))
          .orderBy(desc(postsTable.createdAt)).limit(limit + 1);
      }
    }

    const posts = await query;
    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);
    const formattedPosts = await Promise.all(data.map(p => formatPost(p, userId)));

    res.json({ posts: formattedPosts, nextCursor: hasMore ? data[data.length - 1].id : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get posts" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { content, mediaUrls = [], isAnonymous = false } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }
    if (content.trim().length > 500) {
      res.status(400).json({ error: "ValidationError", message: "Post cannot exceed 500 characters" });
      return;
    }

    const postId = generateId();
    await db.insert(postsTable).values({
      id: postId, content: content.trim(), mediaUrls: JSON.stringify(mediaUrls),
      authorId: userId, isAnonymous: Boolean(isAnonymous), likesCount: 0, commentsCount: 0,
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
    const formatted = await formatPost(posts[0], userId);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get post" });
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
    await db.delete(postsTable).where(eq(postsTable.id, postId));
    await db.update(usersTable).set({ postsCount: sql`${usersTable.postsCount} - 1` }).where(eq(usersTable.id, userId));
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to delete post" });
  }
});

router.post("/:postId/like", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;
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
        const liker = await getAuthor(userId);
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

    const allComments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    const formatted = await Promise.all(allComments.map(async c => {
      const realAuthor = await getAuthor(c.authorId);
      const isOwnComment = c.authorId === userId;
      const isPostAuthor = post && c.authorId === post.authorId;

      let author: any;
      if (post?.isAnonymous && isPostAuthor && !isOwnComment) {
        author = buildAnonAuthor(realAuthor);
      } else {
        const { passwordHash: _, ...a } = realAuthor ? (realAuthor as any) : {};
        author = realAuthor;
      }
      return { ...c, authorId: undefined, author, isOwnComment };
    }));

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
    if (!postRows.length) {
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
      const commenter = await getAuthor(userId);
      const notifBody = post.isAnonymous
        ? "Someone commented on your anonymous post"
        : `${commenter?.name} commented on your post`;
      await db.insert(notificationsTable).values({
        id: generateId(), userId: post.authorId, type: "comment",
        title: "New Comment", body: notifBody,
      });
    }

    const comments = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
    const author = await getAuthor(userId);
    res.status(201).json({ ...comments[0], authorId: undefined, author, replies: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create comment" });
  }
});

export default router;
