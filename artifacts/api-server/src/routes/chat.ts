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

function buildAnonUser(realUser: any) {
  return {
    id: "anonymous",
    name: "Hidden Profile",
    avatar: null,
    program: realUser?.program || null,
    year: realUser?.year || null,
    college: null,
    verified: false,
    isAnonymous: true,
  };
}

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const convs = await db.select().from(conversationsTable)
      .where(or(eq(conversationsTable.participant1Id, userId), eq(conversationsTable.participant2Id, userId)))
      .orderBy(desc(conversationsTable.updatedAt));

    const formatted = await Promise.all(convs.map(async (c) => {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      const isInitiator = c.participant1Id === userId;
      const otherIsInitiator = c.participant1Id === otherId;

      const realOther = await safeUser(otherId);
      const self = await safeUser(userId);

      let other: any;
      if (c.isAnonymous && otherIsInitiator) {
        other = buildAnonUser(realOther);
      } else {
        other = realOther;
      }

      const lastMsgs = await db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, c.id))
        .orderBy(desc(messagesTable.createdAt)).limit(1);
      const lastMsg = lastMsgs.length ? lastMsgs[0] : null;
      let formattedLastMsg = null;
      if (lastMsg) {
        const isSenderInitiator = lastMsg.senderId === c.participant1Id;
        let senderName: string;
        let senderAvatar: string | null;
        if (c.isAnonymous && isSenderInitiator && lastMsg.senderId !== userId) {
          senderName = "Hidden Profile";
          senderAvatar = null;
        } else {
          const sender = await safeUser(lastMsg.senderId);
          senderName = sender?.name || "";
          senderAvatar = sender?.avatar || null;
        }
        formattedLastMsg = { ...lastMsg, senderId: undefined, senderName, senderAvatar };
      }

      return {
        id: c.id,
        isAnonymous: c.isAnonymous,
        anonymousPostId: c.anonymousPostId,
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
    const { participantId, isAnonymous = false, anonymousPostId } = req.body;
    if (!participantId) {
      res.status(400).json({ error: "ValidationError", message: "participantId required" });
      return;
    }
    if (participantId === userId) {
      res.status(400).json({ error: "ValidationError", message: "Cannot message yourself" });
      return;
    }

    if (isAnonymous && anonymousPostId) {
      const anonConvId = generateId();
      await db.insert(conversationsTable).values({
        id: anonConvId, participant1Id: userId, participant2Id: participantId,
        isAnonymous: true, anonymousPostId,
      });
      const newConv = await db.select().from(conversationsTable).where(eq(conversationsTable.id, anonConvId)).limit(1);
      const conv = newConv[0];
      const realSelf = await safeUser(userId);
      const other = await safeUser(participantId);
      const anonSelf = buildAnonUser(realSelf);
      return res.json({
        id: conv.id, isAnonymous: true, anonymousPostId,
        participants: [anonSelf, other], lastMessage: null, unreadCount: 0, updatedAt: conv.updatedAt,
      });
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
    res.json({ id: conv.id, isAnonymous: false, participants: [self, other], lastMessage: null, unreadCount: 0, updatedAt: conv.updatedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create conversation" });
  }
});

router.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;

    const convRows = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
    const conv = convRows[0];

    const msgs = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt)).limit(50);

    const formatted = await Promise.all(msgs.map(async m => {
      const isSenderInitiator = conv && m.senderId === conv.participant1Id;
      const isSelf = m.senderId === userId;
      let senderName: string;
      let senderAvatar: string | null;
      if (conv?.isAnonymous && isSenderInitiator && !isSelf) {
        senderName = "Hidden Profile";
        senderAvatar = null;
      } else {
        const sender = await safeUser(m.senderId);
        senderName = isSelf ? "You" : (sender?.name || "");
        senderAvatar = sender?.avatar || null;
      }
      return { ...m, senderId: undefined, senderName, senderAvatar, isSelf };
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
    if (!content || !content.trim()) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }

    const convRows = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
    if (!convRows.length) {
      res.status(404).json({ error: "NotFound", message: "Conversation not found" });
      return;
    }
    const conv = convRows[0];
    if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
      res.status(403).json({ error: "Forbidden", message: "Not a participant" });
      return;
    }

    const { metadata } = req.body;
    const msgId = generateId();
    await db.insert(messagesTable).values({
      id: msgId, content: content.trim(), senderId: userId, conversationId,
      ...(metadata ? { metadata } : {}),
    });
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
    const isSenderInitiator = msgs[0].senderId === conv.participant1Id;
    let senderName: string;
    let senderAvatar: string | null;
    if (conv.isAnonymous && isSenderInitiator) {
      senderName = "Hidden Profile";
      senderAvatar = null;
    } else {
      const sender = await safeUser(userId);
      senderName = sender?.name || "";
      senderAvatar = sender?.avatar || null;
    }
    res.status(201).json({ ...msgs[0], senderId: undefined, senderName, senderAvatar, isSelf: true });
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
