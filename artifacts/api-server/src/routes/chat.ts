import { Router } from "express";
import { db, pool } from "@workspace/db";
import { conversationsTable, messagesTable, usersTable, chatroomsTable } from "@workspace/db/schema";
import { eq, or, and, desc, lt, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { pickConversationUser, pickMessageSender } from "../lib/userFields";

const router = Router();

// ─── SSE subscriber maps ─────────────────────────────────────────────────────
// These are intentionally module-level (not per-request) so all handlers share them.

const conversationClients = new Map<string, Set<any>>();
const chatroomClients     = new Map<string, Set<any>>();

function pushSSE(map: Map<string, Set<any>>, channelId: string, payload: object) {
  const clients = map.get(channelId);
  if (!clients?.size) return;
  const frame = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.write(frame);
    } catch {
      // Remove stale/closed connections immediately
      clients.delete(client);
    }
  }
  if (!clients.size) map.delete(channelId);
}

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

function buildAnonUser(realUser: any) {
  return {
    id: "anonymous",
    name: "Hidden Profile",
    avatar: null,
    college: null,
    program: realUser?.program || null,
  };
}

// ─── Conversations ────────────────────────────────────────────────────────────

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const convs = await db.select().from(conversationsTable)
      .where(or(eq(conversationsTable.participant1Id, userId), eq(conversationsTable.participant2Id, userId)))
      .orderBy(desc(conversationsTable.updatedAt));

    if (!convs.length) {
      res.json({ conversations: [] });
      return;
    }

    const convIds = convs.map(c => c.id);

    // Collect all participant IDs (includes current user, deduped automatically)
    const allParticipantIds = new Set<string>();
    for (const c of convs) {
      allParticipantIds.add(c.participant1Id);
      allParticipantIds.add(c.participant2Id);
    }

    // Get last message per conversation in one query using DISTINCT ON
    const lastMsgRows: any[] = convIds.length
      ? (await pool.query(
          `SELECT DISTINCT ON (conversation_id) id, content, sender_id, conversation_id, is_read, metadata, created_at
           FROM messages
           WHERE conversation_id = ANY($1)
           ORDER BY conversation_id, created_at DESC`,
          [convIds]
        )).rows
      : [];

    // Collect sender IDs from last messages
    const lastMsgSenderIds = lastMsgRows.map((m: any) => m.sender_id).filter(Boolean);

    // Batch fetch all users (participants + message senders) in one query
    const allUserIds = [...allParticipantIds, ...lastMsgSenderIds];
    const usersMap = await batchGetUsers(allUserIds);

    // Build last message map keyed by conversation_id
    const lastMsgMap = new Map<string, any>();
    for (const m of lastMsgRows) {
      lastMsgMap.set(m.conversation_id, m);
    }

    const formatted = convs.map(c => {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      const otherIsInitiator = c.participant1Id === otherId;

      const realOther = usersMap.get(otherId) || null;
      const self = pickConversationUser(usersMap.get(userId) || null);

      const other = (c.isAnonymous && otherIsInitiator)
        ? buildAnonUser(realOther)
        : pickConversationUser(realOther);

      const rawLastMsg = lastMsgMap.get(c.id) || null;
      let formattedLastMsg = null;
      if (rawLastMsg) {
        const isSenderInitiator = rawLastMsg.sender_id === c.participant1Id;
        let senderName: string;
        let senderAvatar: string | null;
        if (c.isAnonymous && isSenderInitiator && rawLastMsg.sender_id !== userId) {
          senderName = "Hidden Profile";
          senderAvatar = null;
        } else {
          const sender = usersMap.get(rawLastMsg.sender_id);
          senderName = sender?.name || "";
          senderAvatar = sender?.avatar || null;
        }
        formattedLastMsg = {
          id: rawLastMsg.id,
          content: rawLastMsg.content,
          conversationId: rawLastMsg.conversation_id,
          createdAt: rawLastMsg.created_at,
          metadata: rawLastMsg.metadata,
          senderName,
          senderAvatar,
        };
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
    });

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
      const usersMap = await batchGetUsers([userId, participantId]);
      const realSelf = usersMap.get(userId);
      const other = pickConversationUser(usersMap.get(participantId) || null);
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

    const usersMap = await batchGetUsers([userId, participantId]);
    const other = pickConversationUser(usersMap.get(participantId) || null);
    const self = pickConversationUser(usersMap.get(userId) || null);
    res.json({ id: conv.id, isAnonymous: false, participants: [self, other], lastMessage: null, unreadCount: 0, updatedAt: conv.updatedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create conversation" });
  }
});

// ─── DM Messages ──────────────────────────────────────────────────────────────

router.get("/conversations/:conversationId/stream", authMiddleware, async (req, res) => {
  const conversationId = req.params["conversationId"] as string;
  const userId = (req as any).userId;

  // Verify the requester is a participant before opening the stream
  const convRows = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId)).limit(1);
  if (!convRows.length) {
    res.status(404).json({ error: "NotFound", message: "Conversation not found" });
    return;
  }
  const conv = convRows[0];
  if (conv.participant1Id !== userId && conv.participant2Id !== userId) {
    res.status(403).json({ error: "Forbidden", message: "Not a participant" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  if (!conversationClients.has(conversationId)) conversationClients.set(conversationId, new Set());
  conversationClients.get(conversationId)!.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const s = conversationClients.get(conversationId);
    if (s) { s.delete(res); if (!s.size) conversationClients.delete(conversationId); }
  });
});

router.get("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { conversationId } = req.params;
    const cursor = req.query["cursor"] as string | undefined;
    const rawLimit = parseInt(req.query["limit"] as string || "30", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 30;

    const convRows = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
    const conv = convRows[0];

    // Resolve cursor to a timestamp — scoped to this conversation to prevent cross-thread leakage
    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorRows = await db.select({ createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(and(eq(messagesTable.id, cursor), eq(messagesTable.conversationId, conversationId)))
        .limit(1);
      if (cursorRows.length) cursorDate = cursorRows[0].createdAt;
    }

    // Fetch one extra row to determine whether another page exists
    const rows = await db.select().from(messagesTable)
      .where(cursorDate
        ? and(eq(messagesTable.conversationId, conversationId), lt(messagesTable.createdAt, cursorDate))
        : eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt)).limit(limit + 1);

    const hasMore = rows.length > limit;
    const msgs = hasMore ? rows.slice(0, limit) : rows;

    if (!msgs.length) {
      res.json({ messages: [], nextCursor: null });
      return;
    }

    // Batch fetch all unique senders in one query
    const senderIds = msgs.map(m => m.senderId);
    const sendersMap = await batchGetUsers(senderIds);

    const formatted = msgs.map(m => {
      const isSenderInitiator = conv && m.senderId === conv.participant1Id;
      const isSelf = m.senderId === userId;
      const sender = (conv?.isAnonymous && isSenderInitiator && !isSelf)
        ? { id: "anonymous", name: "Hidden Profile", avatar: null }
        : pickMessageSender(sendersMap.get(m.senderId));
      return { ...m, senderId: undefined, sender, isSelf };
    });

    // nextCursor = oldest message ID on this page; null when no further pages exist
    const nextCursor = hasMore ? msgs[msgs.length - 1].id : null;
    res.json({ messages: formatted, nextCursor });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get messages" });
  }
});

router.post("/conversations/:conversationId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const conversationId = req.params["conversationId"] as string;
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
    let sender: { id: string; name: string; avatar: string | null };
    if (conv.isAnonymous && isSenderInitiator) {
      sender = { id: "anonymous", name: "Hidden Profile", avatar: null };
    } else {
      const sendersMap = await batchGetUsers([userId]);
      sender = pickMessageSender(sendersMap.get(userId));
    }

    const messagePayload = { ...msgs[0], senderId: undefined, sender };
    pushSSE(conversationClients, conversationId, messagePayload);
    res.status(201).json({ ...messagePayload, isSelf: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to send message" });
  }
});

// ─── Chatrooms ────────────────────────────────────────────────────────────────

router.get("/chatrooms", authMiddleware, async (req, res) => {
  try {
    const chatrooms = await db.select().from(chatroomsTable).orderBy(chatroomsTable.name);

    if (!chatrooms.length) {
      res.json({ chatrooms: [] });
      return;
    }

    const chatroomIds = chatrooms.map(r => r.id);

    // Get last message per chatroom in one query using DISTINCT ON
    const lastMsgRows: any[] = (await pool.query(
      `SELECT DISTINCT ON (chatroom_id) id, content, sender_id, chatroom_id, created_at
       FROM messages
       WHERE chatroom_id = ANY($1)
       ORDER BY chatroom_id, created_at DESC`,
      [chatroomIds]
    )).rows;

    // Batch fetch all last-message senders at once
    const senderIds = lastMsgRows.map((m: any) => m.sender_id).filter(Boolean);
    const sendersMap = await batchGetUsers(senderIds);

    // Build last message map keyed by chatroom_id
    const lastMsgMap = new Map<string, any>();
    for (const m of lastMsgRows) {
      lastMsgMap.set(m.chatroom_id, m);
    }

    const formatted = chatrooms.map(r => {
      const rawLastMsg = lastMsgMap.get(r.id) || null;
      let formattedLastMsg = null;
      if (rawLastMsg) {
        const sender = sendersMap.get(rawLastMsg.sender_id);
        formattedLastMsg = {
          id: rawLastMsg.id,
          content: rawLastMsg.content,
          chatroomId: rawLastMsg.chatroom_id,
          createdAt: rawLastMsg.created_at,
          senderName: sender?.name || "",
          senderAvatar: sender?.avatar || null,
        };
      }
      return { ...r, lastMessage: formattedLastMsg };
    });

    res.json({ chatrooms: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get chatrooms" });
  }
});

router.get("/chatrooms/:chatroomId/stream", authMiddleware, (req, res) => {
  const chatroomId = req.params["chatroomId"] as string;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  if (!chatroomClients.has(chatroomId)) chatroomClients.set(chatroomId, new Set());
  chatroomClients.get(chatroomId)!.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const s = chatroomClients.get(chatroomId);
    if (s) { s.delete(res); if (!s.size) chatroomClients.delete(chatroomId); }
  });
});

router.get("/chatrooms/:chatroomId/messages", authMiddleware, async (req, res) => {
  try {
    const { chatroomId } = req.params;
    const cursor = req.query["cursor"] as string | undefined;
    const rawLimit = parseInt(req.query["limit"] as string || "30", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 30;

    // Resolve cursor to a timestamp — scoped to this chatroom to prevent cross-thread leakage
    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorRows = await db.select({ createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(and(eq(messagesTable.id, cursor), eq(messagesTable.chatroomId, chatroomId)))
        .limit(1);
      if (cursorRows.length) cursorDate = cursorRows[0].createdAt;
    }

    // Fetch one extra row to determine whether another page exists
    const rows = await db.select().from(messagesTable)
      .where(cursorDate
        ? and(eq(messagesTable.chatroomId, chatroomId), lt(messagesTable.createdAt, cursorDate))
        : eq(messagesTable.chatroomId, chatroomId))
      .orderBy(desc(messagesTable.createdAt)).limit(limit + 1);

    const hasMore = rows.length > limit;
    const msgs = hasMore ? rows.slice(0, limit) : rows;

    if (!msgs.length) {
      res.json({ messages: [], nextCursor: null });
      return;
    }

    // Batch fetch all senders in one query
    const senderIds = msgs.map(m => m.senderId);
    const sendersMap = await batchGetUsers(senderIds);

    const formatted = msgs.map(m => ({
      ...m,
      senderId: undefined,
      sender: pickMessageSender(sendersMap.get(m.senderId)),
    }));

    // nextCursor = oldest message ID on this page; null when no further pages exist
    const nextCursor = hasMore ? msgs[msgs.length - 1].id : null;
    res.json({ messages: formatted, nextCursor });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get chatroom messages" });
  }
});

router.post("/chatrooms/:chatroomId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const chatroomId = req.params["chatroomId"] as string;
    const { content } = req.body;
    if (!content) {
      res.status(400).json({ error: "ValidationError", message: "Content is required" });
      return;
    }

    const msgId = generateId();
    await db.insert(messagesTable).values({ id: msgId, content, senderId: userId, chatroomId });
    await db.update(chatroomsTable).set({ updatedAt: new Date() }).where(eq(chatroomsTable.id, chatroomId));

    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);
    const sendersMap = await batchGetUsers([userId]);
    const chatroomPayload = { ...msgs[0], senderId: undefined, sender: pickMessageSender(sendersMap.get(userId)) };
    pushSSE(chatroomClients, chatroomId, chatroomPayload);
    res.status(201).json(chatroomPayload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to send chatroom message" });
  }
});

export default router;
