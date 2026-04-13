import { Router } from "express";
import { db } from "@workspace/db";
import {
  orderMessagesTable,
  deliveriesTable,
  assignmentsTable,
  certificationsTable,
  projectsTable,
  tasksTable,
  taskApplicationsTable,
  serviceBookingsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { notifyUser } from "../lib/pushNotifications";

async function safeUser(userId: string) {
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!rows.length) return null;
    const { passwordHash: _, ...safe } = rows[0] as any;
    return safe;
  } catch {
    return null;
  }
}

const router = Router();

// ─── Resolve order participants (userId1 = owner/poster, userId2 = other party) ──

async function getOrderParticipants(orderId: string, orderType: string): Promise<{ user1: string; user2: string | null } | null> {
  try {
    if (orderType === "deliveries") {
      const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, orderId)).limit(1);
      if (!rows.length) return null;
      return { user1: rows[0].requesterId, user2: rows[0].deliveryAgentId ?? null };
    }

    if (orderType === "tasks") {
      const rows = await db.select().from(tasksTable).where(eq(tasksTable.id, orderId)).limit(1);
      if (!rows.length) return null;
      return { user1: rows[0].posterId, user2: rows[0].assignedToId ?? null };
    }

    // For assignments / certifications / projects:
    // New-model orders: orderId is a serviceBookingsTable.id (booking record)
    // Old-model orders: orderId is the listing id with bookedById on the listing itself
    if (orderType === "assignments" || orderType === "certifications" || orderType === "projects") {
      // Try new-model first: check serviceBookingsTable
      const bookingRows = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, orderId)).limit(1);
      if (bookingRows.length) {
        const booking = bookingRows[0];
        // Resolve the listing to get the poster (provider) ID
        let posterId: string | null = null;
        if (orderType === "assignments") {
          const listing = await db.select({ posterId: assignmentsTable.posterId }).from(assignmentsTable).where(eq(assignmentsTable.id, booking.listingId)).limit(1);
          posterId = listing[0]?.posterId ?? null;
        } else if (orderType === "certifications") {
          const listing = await db.select({ posterId: certificationsTable.posterId }).from(certificationsTable).where(eq(certificationsTable.id, booking.listingId)).limit(1);
          posterId = listing[0]?.posterId ?? null;
        } else if (orderType === "projects") {
          const listing = await db.select({ posterId: projectsTable.posterId }).from(projectsTable).where(eq(projectsTable.id, booking.listingId)).limit(1);
          posterId = listing[0]?.posterId ?? null;
        }
        if (!posterId) return null;
        return { user1: posterId, user2: booking.studentId };
      }
      // Fall back to old-model: orderId is the listing ID itself
      if (orderType === "assignments") {
        const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, orderId)).limit(1);
        if (!rows.length) return null;
        return { user1: rows[0].posterId, user2: rows[0].bookedById ?? null };
      }
      if (orderType === "certifications") {
        const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, orderId)).limit(1);
        if (!rows.length) return null;
        return { user1: rows[0].posterId, user2: rows[0].bookedById ?? null };
      }
      if (orderType === "projects") {
        const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, orderId)).limit(1);
        if (!rows.length) return null;
        return { user1: rows[0].posterId, user2: rows[0].bookedById ?? null };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── DELETE helper — called when order completes ──────────────────────────────

export async function deleteOrderMessages(orderId: string) {
  try {
    await db.delete(orderMessagesTable).where(eq(orderMessagesTable.orderId, orderId));
  } catch (err) {
    console.error("[order-chat] Failed to delete messages for order", orderId, err);
  }
}

// ─── GET /services/order-chat/:orderId?orderType=… ───────────────────────────

router.get("/:orderId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { orderId } = req.params;
    const orderType = (req.query.orderType as string) || "deliveries";

    const participants = await getOrderParticipants(orderId, orderType);
    if (!participants || (participants.user1 !== userId && participants.user2 !== userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const msgs = await db
      .select()
      .from(orderMessagesTable)
      .where(eq(orderMessagesTable.orderId, orderId))
      .orderBy(asc(orderMessagesTable.createdAt));

    const formatted = await Promise.all(
      msgs.map(async (m) => {
        const sender = await safeUser(m.senderId);
        return {
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          isSelf: m.senderId === userId,
          senderName: sender?.name ?? "Unknown",
          senderAvatar: sender?.avatar ?? null,
        };
      })
    );

    res.json({ messages: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError" });
  }
});

// ─── POST /services/order-chat/:orderId ──────────────────────────────────────

router.post("/:orderId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { orderId } = req.params;
    const { content, orderType = "deliveries", orderTitle = "Order" } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ error: "Content required" });
      return;
    }

    const participants = await getOrderParticipants(orderId, orderType);
    if (!participants || (participants.user1 !== userId && participants.user2 !== userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const msgId = generateId();
    await db.insert(orderMessagesTable).values({
      id: msgId,
      orderId,
      orderType,
      senderId: userId,
      content: content.trim(),
    });

    const sender = await safeUser(userId);
    const otherId = participants.user1 === userId ? participants.user2 : participants.user1;

    res.status(201).json({
      id: msgId,
      content: content.trim(),
      createdAt: new Date(),
      isSelf: true,
      senderName: sender?.name ?? "Unknown",
      senderAvatar: sender?.avatar ?? null,
    });

    // Notify the other party asynchronously
    if (otherId) {
      notifyUser(otherId, {
        type: "order_chat",
        title: "💬 New Order Message",
        body: `${sender?.name ?? "Someone"} sent a message about: ${orderTitle}`,
        data: {
          screen: "/(tabs)/services",
          tab: "active",
          openOrderChat: orderId,
          orderType,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError" });
  }
});

export default router;
