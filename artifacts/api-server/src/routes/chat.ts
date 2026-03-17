import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, usersTable, chatroomsTable } from "@workspace/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

async function safeUser(userId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users.length) return null;
  const { passwordHash: _, ...u } = users[0];
  return u;
}

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const convs = await db.select().from(conversationsTable)
      .where(or(eq(conversationsTable.participant1Id, userId), eq(conversationsTable.participant2Id, userId)))
      .orderBy(desc(conversationsTable.updatedAt));

    const formatted = await Promise.all(convs.map(async (c) => {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      const other = await safeUser(otherId);
      const self = await safeUser(userId);
      const lastMsgs = await db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, c.id))
        .orderBy(desc(messagesTable.createdAt)).limit(1);
      const lastMsg = lastMsgs.length ? lastMsgs[0] : null;
      let formattedLastMsg = null;
      if (lastMsg) {
        const sender = await safeUser(lastMsg.senderId);
        formattedLastMsg = { ...lastMsg, senderName: sender?.name || "", senderAvatar: sender?.avatar || null };
      }
      return {
        id: c.id,
        participants: [self, other].filter(Boolean),
        lastMessage: formattedLastMsg,
        unreadCount: 0,
        updatedAt: c.updatedAt,
      };
    }));

    res.json({ conversations: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get conversations" });
  }
});

router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { participantId } = req.body;
    if (!participantId) {
      res.status(400).json({ error: "ValidationError", message: "participantId required" });
      return;
    }

    const existing = await db.select().from(conversationsTable)
      .where(or(
        and(eq(conversationsTable.participant1Id, userId), eq(conversationsTable.participant2Id, participantId)),
        and(eq(conversationsTable.participant1Id, participantId), eq(conversationsTable.participant2Id, userId)),
      )).limit(1);

    let conv: any;
    if (existing.length > 0) {
      conv = existing[0];
    } else {
      const convId = generateId();
      await db.insert(conversationsTable).values({ id: convId, participant1Id: userId, participant2Id: participantId });
      const newConv = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
      conv = newConv[0];
    }

    const other = await safeUser(participantId);
    const self = await safeUser(userId);
    res.json({ id: conv.id, participants: [self, other], lastMessage: null, unreadCount: 0, updatedAt: conv.updatedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create conversation" });
  }
});

router.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const msgs = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt)).limit(50);

    const formatted = await Promise.all(msgs.map(async m => {
      const sender = await safeUser(m.senderId);
      return { ...m, senderName: sender?.name || "", senderAvatar: sender?.avatar || null };
    }));

    res.json({ messages: formatted, nextCursor: null });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get messages" });
  }
});

router.post("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }

    const msgId = generateId();
    await db.insert(messagesTable).values({ id: msgId, content, senderId: userId, conversationId });
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
    const sender = await safeUser(userId);
    const formatted = { ...msgs[0], senderName: sender?.name || "", senderAvatar: sender?.avatar || null };
    res.status(201).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to send message" });
  }
});

router.get("/chatrooms", authMiddleware, async (req, res) => {
  try {
    const chatrooms = await db.select().from(chatroomsTable).orderBy(chatroomsTable.name);
    const formatted = await Promise.all(chatrooms.map(async r => {
      const lastMsgs = await db.select().from(messagesTable)
        .where(eq(messagesTable.chatroomId, r.id))
        .orderBy(desc(messagesTable.createdAt)).limit(1);
      const lastMsg = lastMsgs.length ? lastMsgs[0] : null;
      let formattedLastMsg = null;
      if (lastMsg) {
        const sender = await safeUser(lastMsg.senderId);
        formattedLastMsg = { ...lastMsg, senderName: sender?.name || "", senderAvatar: sender?.avatar || null };
      }
      return { ...r, lastMessage: formattedLastMsg };
    }));
    res.json({ chatrooms: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get chatrooms" });
  }
});

router.get("/chatrooms/:chatroomId/messages", authMiddleware, async (req, res) => {
  try {
    const { chatroomId } = req.params;
    const msgs = await db.select().from(messagesTable)
      .where(eq(messagesTable.chatroomId, chatroomId))
      .orderBy(desc(messagesTable.createdAt)).limit(50);

    const formatted = await Promise.all(msgs.map(async m => {
      const sender = await safeUser(m.senderId);
      return { ...m, senderName: sender?.name || "", senderAvatar: sender?.avatar || null };
    }));
    res.json({ messages: formatted, nextCursor: null });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get chatroom messages" });
  }
});

router.post("/chatrooms/:chatroomId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { chatroomId } = req.params;
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }

    const msgId = generateId();
    await db.insert(messagesTable).values({ id: msgId, content, senderId: userId, chatroomId });
    await db.update(chatroomsTable).set({ updatedAt: new Date() }).where(eq(chatroomsTable.id, chatroomId));

    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
    const sender = await safeUser(userId);
    res.status(201).json({ ...msgs[0], senderName: sender?.name || "", senderAvatar: sender?.avatar || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to send chatroom message" });
  }
});

export default router;
