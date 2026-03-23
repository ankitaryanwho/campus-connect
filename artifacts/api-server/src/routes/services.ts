import { Router } from "express";
import { db } from "@workspace/db";
import {
  assignmentsTable, certificationsTable, deliveriesTable, outletItemsTable,
  tasksTable, taskApplicationsTable, projectsTable, usersTable,
} from "@workspace/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
const GATE_LOCATIONS = ["Gate No 3", "Gate No 1"];
const OUTLET_LOCATIONS = ["Southern Stories", "Hotspot", "Snapeats", "Kathi Junction", "Dominos", "Subway"];
const COURIER_COMPANIES = ["EKart Logistics", "BlueDart", "Amazon Shipping", "ShadowFax", "Express News", "SafeXpress"];

async function safeUser(userId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users.length) return null;
  const { passwordHash: _, ...u } = users[0];
  return u;
}

async function currentUser(userId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return users[0] || null;
}

function appendHistory(existing: string | null, status: string): string {
  const h = existing ? JSON.parse(existing) : [];
  h.push({ status, at: new Date().toISOString() });
  return JSON.stringify(h);
}

// ─── Assignments ──────────────────────────────────────────────────────────────

router.get("/assignments", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    let rows = await db.select().from(assignmentsTable).orderBy(desc(assignmentsTable.createdAt));

    // Students only see assignments matching their program and for their year
    if (me.role === "student" && me.program && me.year) {
      rows = rows.filter(a => a.program === me.program && a.targetYear === me.year);
    }

    const formatted = await Promise.all(rows.map(async a => ({
      ...a,
      poster: await safeUser(a.posterId),
      bookedBy: a.bookedById ? await safeUser(a.bookedById) : null,
    })));
    res.json({ assignments: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get assignments" });
  }
});

router.post("/assignments", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Only providers can post
    if (me.role !== "provider") {
      res.status(403).json({ error: "Forbidden", message: "Only service providers can post assignments" });
      return;
    }

    const { title, description, price, subject, targetYear, deadline } = req.body;
    if (!title || !description || !price || !subject || !targetYear) {
      res.status(400).json({ error: "ValidationError", message: "Title, description, price, subject and year are required" });
      return;
    }

    const year = parseInt(targetYear);
    const program = me.program || "Other";

    // Year restriction: can only post for their own year or below
    if (me.year && year > me.year) {
      res.status(403).json({ error: "Forbidden", message: `You can only post assignments for Year ${me.year} and below` });
      return;
    }

    if (year < 1 || year > 4) {
      res.status(400).json({ error: "ValidationError", message: "Year must be 1-4" });
      return;
    }

    const id = generateId();
    await db.insert(assignmentsTable).values({
      id, title, description, price: price.toString(), subject,
      program, targetYear: year,
      posterId: userId,
      deadline: deadline ? new Date(deadline) : null,
    });

    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.status(201).json({ ...rows[0], poster: await safeUser(userId), bookedBy: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create assignment" });
  }
});

router.post("/assignments/:id/book", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId === userId) { res.status(400).json({ error: "Cannot book your own listing" }); return; }
    if (rows[0].status !== "open") { res.status(400).json({ error: "Already booked" }); return; }
    const history = appendHistory(rows[0].statusHistory, "booked");
    await db.update(assignmentsTable).set({ bookedById: userId, status: "booked", statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to book assignment" });
  }
});

router.post("/assignments/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can accept bookings" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(assignmentsTable).set({ status: "accepted", statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to accept" }); }
});

router.post("/assignments/:id/reject", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can reject bookings" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status to reject" }); return; }
    const history = appendHistory(rows[0].statusHistory, "open");
    await db.update(assignmentsTable)
      .set({ status: "open", bookedById: null, statusHistory: history })
      .where(eq(assignmentsTable.id, id));
    res.json({ message: "Booking rejected, listing is open again" });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to reject" }); }
});

router.post("/assignments/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can update status" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from status: " + rows[0].status }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(assignmentsTable).set({ status: nextStatus, statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to update status" }); }
});

router.post("/assignments/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the student can confirm delivery" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Provider must mark as completed first" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(assignmentsTable).set({ status: "delivered", statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to confirm delivery" }); }
});

// ─── Certifications ───────────────────────────────────────────────────────────

router.get("/certifications", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    let rows = await db.select().from(certificationsTable).orderBy(desc(certificationsTable.createdAt));

    // Students only see certs for their program and year
    if (me.role === "student" && me.program && me.year) {
      rows = rows.filter(c => c.program === me.program && c.targetYear === me.year);
    }

    const formatted = await Promise.all(rows.map(async c => ({
      ...c,
      poster: await safeUser(c.posterId),
      bookedBy: c.bookedById ? await safeUser(c.bookedById) : null,
    })));
    res.json({ certifications: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get certifications" });
  }
});

router.post("/certifications", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    if (me.role !== "provider") {
      res.status(403).json({ error: "Forbidden", message: "Only service providers can post certifications" });
      return;
    }

    const { title, description, price, subject, targetYear, program, deadline } = req.body;
    if (!title || !description || !price || !subject || !targetYear || !program) {
      res.status(400).json({ error: "ValidationError", message: "Title, description, price, subject, year and program are required" });
      return;
    }

    const year = parseInt(targetYear);
    if (year < 1 || year > 4) {
      res.status(400).json({ error: "ValidationError", message: "Year must be 1-4" });
      return;
    }

    const id = generateId();
    await db.insert(certificationsTable).values({
      id, title, description, price: price.toString(), subject,
      program, targetYear: year,
      posterId: userId,
      deadline: deadline ? new Date(deadline) : null,
    });

    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.status(201).json({ ...rows[0], poster: await safeUser(userId), bookedBy: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create certification" });
  }
});

router.post("/certifications/:id/book", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId === userId) { res.status(400).json({ error: "Cannot book your own listing" }); return; }
    if (rows[0].status !== "open") { res.status(400).json({ error: "Already booked" }); return; }
    const history = appendHistory(rows[0].statusHistory, "booked");
    await db.update(certificationsTable).set({ bookedById: userId, status: "booked", statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to book certification" });
  }
});

router.post("/certifications/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can accept bookings" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(certificationsTable).set({ status: "accepted", statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to accept" }); }
});

router.post("/certifications/:id/reject", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can reject bookings" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status to reject" }); return; }
    const history = appendHistory(rows[0].statusHistory, "open");
    await db.update(certificationsTable)
      .set({ status: "open", bookedById: null, statusHistory: history })
      .where(eq(certificationsTable.id, id));
    res.json({ message: "Booking rejected, listing is open again" });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to reject" }); }
});

router.post("/certifications/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can update status" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from status: " + rows[0].status }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(certificationsTable).set({ status: nextStatus, statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to update status" }); }
});

router.post("/certifications/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the student can confirm delivery" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Provider must mark as completed first" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(certificationsTable).set({ status: "delivered", statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to confirm delivery" }); }
});

// ─── Outlet Items ─────────────────────────────────────────────────────────────

router.get("/outlet-items", authMiddleware, async (req, res) => {
  try {
    const items = await db.select().from(outletItemsTable).orderBy(outletItemsTable.outletName, outletItemsTable.name);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get outlet items" });
  }
});

// Admin only - manage outlet items
router.post("/outlet-items", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const { outletName, name, price } = req.body;
    if (!outletName || !name || !price) { res.status(400).json({ error: "ValidationError", message: "outletName, name and price are required" }); return; }
    const id = generateId();
    await db.insert(outletItemsTable).values({ id, outletName, name, price: price.toString() });
    const rows = await db.select().from(outletItemsTable).where(eq(outletItemsTable.id, id)).limit(1);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to create outlet item" });
  }
});

router.patch("/outlet-items/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const { id } = req.params;
    const { name, price, available } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price.toString();
    if (available !== undefined) updates.available = available;
    await db.update(outletItemsTable).set(updates).where(eq(outletItemsTable.id, id));
    const rows = await db.select().from(outletItemsTable).where(eq(outletItemsTable.id, id)).limit(1);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to update outlet item" });
  }
});

router.delete("/outlet-items/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (me?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    await db.delete(outletItemsTable).where(eq(outletItemsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to delete outlet item" });
  }
});

// ─── Deliveries ───────────────────────────────────────────────────────────────

router.get("/deliveries", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    let rows = await db.select().from(deliveriesTable).orderBy(desc(deliveriesTable.createdAt));

    // Students see their own requests; providers see pending + their accepted ones
    if (me.role === "student") {
      rows = rows.filter(d => d.requesterId === userId);
    } else if (me.role === "provider") {
      rows = rows.filter(d => d.status === "pending" || d.deliveryAgentId === userId);
    }

    const formatted = await Promise.all(rows.map(async d => ({
      ...d,
      requester: await safeUser(d.requesterId),
      deliveryAgent: d.deliveryAgentId ? await safeUser(d.deliveryAgentId) : null,
    })));
    res.json({ deliveries: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get deliveries" });
  }
});

router.post("/deliveries", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const {
      pickupType, pickupLocation, dropLocation,
      websiteName, courierCompany, orderCustomerName, orderId, orderMobile,
      foodItems, subtotal,
    } = req.body;

    if (!pickupType || !pickupLocation || !dropLocation) {
      res.status(400).json({ error: "ValidationError", message: "pickupType, pickupLocation and dropLocation are required" });
      return;
    }

    if (pickupType === "gate" && (!websiteName || !courierCompany || !orderCustomerName || !orderId || !orderMobile)) {
      res.status(400).json({ error: "ValidationError", message: "Gate pickups require website, courier company, customer name, order ID and mobile" });
      return;
    }

    if (pickupType === "outlet" && (!foodItems || !subtotal)) {
      res.status(400).json({ error: "ValidationError", message: "Outlet pickups require food items and subtotal" });
      return;
    }

    const id = generateId();
    const deliveryFee = pickupType === "outlet" ? "30" : "20";

    await db.insert(deliveriesTable).values({
      id, requesterId: userId, pickupType, pickupLocation, dropLocation,
      websiteName: websiteName || null,
      courierCompany: courierCompany || null,
      orderCustomerName: orderCustomerName || null,
      orderId: orderId || null,
      orderMobile: orderMobile || null,
      foodItems: foodItems ? JSON.stringify(foodItems) : null,
      subtotal: subtotal ? subtotal.toString() : null,
      deliveryFee,
    } as any);

    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.status(201).json({ ...rows[0], requester: await safeUser(userId), deliveryAgent: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create delivery" });
  }
});

router.post("/deliveries/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId === userId) { res.status(400).json({ error: "Cannot accept your own request" }); return; }
    if (rows[0].status !== "pending") { res.status(400).json({ error: "Already accepted" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(deliveriesTable).set({
      deliveryAgentId: userId,
      status: "accepted",
      statusHistory: history,
    }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to accept delivery" });
  }
});

// Provider advances delivery through Zomato-style steps
router.post("/deliveries/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can update status" }); return; }
    const isOutlet = rows[0].pickupType === "outlet";
    const progressMap: Record<string, string> = {
      accepted: "reaching_pickup",
      ...(isOutlet
        ? { reaching_pickup: "placed_order", placed_order: "collecting_order", collecting_order: "reaching_drop" }
        : { reaching_pickup: "reaching_drop" }),
      reaching_drop: "completed",
    };
    const nextStatus = progressMap[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from status: " + rows[0].status }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(deliveriesTable).set({ status: nextStatus, statusHistory: history }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to progress delivery" }); }
});

// Student confirms delivery received
router.post("/deliveries/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId !== userId) { res.status(403).json({ error: "Only the requester can confirm delivery" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Agent must mark as completed first" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(deliveriesTable).set({ status: "delivered", statusHistory: history }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(userId), deliveryAgent: updated[0].deliveryAgentId ? await safeUser(updated[0].deliveryAgentId) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to confirm delivery" }); }
});

router.post("/deliveries/:id/reject", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await db.update(deliveriesTable).set({ status: "pending", deliveryAgentId: null }).where(eq(deliveriesTable.id, id));
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...rows[0], requester: await safeUser(rows[0].requesterId), deliveryAgent: null });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to reject delivery" });
  }
});

router.post("/deliveries/:id/mark-paid", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId !== userId) { res.status(403).json({ error: "Only the requester can mark as paid" }); return; }
    await db.update(deliveriesTable).set({ status: "payment_marked", paymentMarkedAt: new Date() }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: updated[0].deliveryAgentId ? await safeUser(updated[0].deliveryAgentId) : null });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to mark as paid" });
  }
});

router.post("/deliveries/:id/confirm-payment", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can confirm payment" }); return; }
    await db.update(deliveriesTable).set({ status: "in_progress" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to confirm payment" });
  }
});

router.post("/deliveries/:id/complete", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can mark complete" }); return; }
    await db.update(deliveriesTable).set({ status: "completed" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to complete delivery" });
  }
});

router.post("/deliveries/:id/rate", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { ratingHappiness, ratingHandling, ratingOnTime, ratingComment } = req.body;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId !== userId) { res.status(403).json({ error: "Only the requester can rate" }); return; }
    if (!["completed", "delivered"].includes(rows[0].status)) { res.status(400).json({ error: "Can only rate completed or delivered orders" }); return; }
    await db.update(deliveriesTable).set({ ratingHappiness, ratingHandling, ratingOnTime, ratingComment }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: updated[0].deliveryAgentId ? await safeUser(updated[0].deliveryAgentId) : null });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to submit rating" });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

router.get("/tasks", authMiddleware, async (req, res) => {
  try {
    const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt));
    const formatted = await Promise.all(tasks.map(async t => ({
      ...t,
      poster: await safeUser(t.posterId),
      assignedTo: t.assignedToId ? await safeUser(t.assignedToId) : null,
    })));
    res.json({ tasks: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get tasks" });
  }
});

router.post("/tasks", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { title, description, budget, category, deadline } = req.body;
    if (!title || !description || !budget || !category) {
      res.status(400).json({ error: "ValidationError", message: "Title, description, budget and category are required" });
      return;
    }
    const id = generateId();
    await db.insert(tasksTable).values({
      id, title, description, budget: budget.toString(), category,
      posterId: userId, deadline: deadline ? new Date(deadline) : null,
    });
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
    res.status(201).json({ ...tasks[0], poster: await safeUser(userId), assignedTo: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create task" });
  }
});

router.post("/tasks/:taskId/apply", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { taskId } = req.params;
    const existing = await db.select().from(taskApplicationsTable)
      .where(and(eq(taskApplicationsTable.taskId, taskId), eq(taskApplicationsTable.applicantId, userId)))
      .limit(1);
    if (existing.length) {
      res.status(400).json({ error: "AlreadyApplied", message: "You have already applied" }); return;
    }
    await db.insert(taskApplicationsTable).values({ id: generateId(), taskId, applicantId: userId });
    await db.update(tasksTable).set({ applicantsCount: sql`${tasksTable.applicantsCount} + 1` }).where(eq(tasksTable.id, taskId));
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
    res.json({ ...tasks[0], poster: await safeUser(tasks[0].posterId), assignedTo: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to apply for task" });
  }
});

// ─── Provider Earnings ────────────────────────────────────────────────────────

router.get("/my-earnings", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    // Gather completed assignments as provider
    const completedAssignments = await db.select().from(assignmentsTable)
      .where(and(eq(assignmentsTable.bookedById, userId), eq(assignmentsTable.status, "delivered")));

    // Gather completed deliveries as provider
    const completedDeliveries = await db.select().from(deliveriesTable)
      .where(and(eq(deliveriesTable.deliveryAgentId, userId), eq(deliveriesTable.status, "delivered")));

    const allOrders = [
      ...completedAssignments.map(a => ({ amount: a.price, createdAt: a.createdAt, type: "assignment" })),
      ...completedDeliveries.map(d => ({ amount: d.deliveryFee || "0", createdAt: d.createdAt, type: "delivery" })),
    ];

    const total = allOrders.reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0);
    const today = allOrders
      .filter(o => o.createdAt && new Date(o.createdAt) >= todayStart)
      .reduce((sum, o) => sum + parseFloat(o.amount || "0"), 0);

    res.json({ total, today, orders: allOrders.length });
  } catch (err) {
    console.error(err);
    res.json({ total: 0, today: 0, orders: 0 });
  }
});

// ─── Projects ─────────────────────────────────────────────────────────────────

router.get("/projects", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
    const formatted = await Promise.all(rows.map(async p => ({
      ...p,
      poster: await safeUser(p.posterId),
      bookedBy: p.bookedById ? await safeUser(p.bookedById) : null,
    })));
    res.json({ projects: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get projects" });
  }
});

router.post("/projects", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (me.role !== "provider") {
      res.status(403).json({ error: "Forbidden", message: "Only service providers can post projects" });
      return;
    }
    const { title, description, price, skills, projectType, techStack, deadline } = req.body;
    if (!title || !description || !price || !skills || !projectType) {
      res.status(400).json({ error: "ValidationError", message: "Title, description, price, skills and project type are required" });
      return;
    }
    const id = generateId();
    await db.insert(projectsTable).values({
      id, title, description, price: price.toString(), skills,
      projectType, techStack: techStack || null,
      posterId: userId,
      deadline: deadline ? new Date(deadline) : null,
    });
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.status(201).json({ ...rows[0], poster: await safeUser(userId), bookedBy: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create project" });
  }
});

router.post("/projects/:id/book", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId === userId) { res.status(400).json({ error: "Cannot book your own listing" }); return; }
    if (rows[0].status !== "open") { res.status(400).json({ error: "Already booked" }); return; }
    const history = appendHistory(rows[0].statusHistory, "booked");
    await db.update(projectsTable).set({ bookedById: userId, status: "booked", statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to book project" });
  }
});

router.post("/projects/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can accept bookings" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(projectsTable).set({ status: "accepted", statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to accept" }); }
});

router.post("/projects/:id/reject", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can reject bookings" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status to reject" }); return; }
    const history = appendHistory(rows[0].statusHistory, "open");
    await db.update(projectsTable).set({ status: "open", bookedById: null, statusHistory: history }).where(eq(projectsTable.id, id));
    res.json({ message: "Booking rejected, listing is open again" });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to reject" }); }
});

router.post("/projects/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can update status" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from status: " + rows[0].status }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(projectsTable).set({ status: nextStatus, statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to update status" }); }
});

router.post("/projects/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the student can confirm delivery" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Provider must mark as completed first" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(projectsTable).set({ status: "delivered", statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to confirm delivery" }); }
});

export default router;
