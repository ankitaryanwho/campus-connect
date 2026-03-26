import { Router } from "express";
import { db } from "@workspace/db";
import {
  assignmentsTable, certificationsTable, deliveriesTable, outletItemsTable,
  tasksTable, taskApplicationsTable, projectsTable, usersTable, serviceBookingsTable,
  walletsTable, transactionsTable,
} from "@workspace/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { notifyUser, notifyUsers } from "../lib/pushNotifications";

const router = Router();

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
const GATE_LOCATIONS = ["Gate No 3", "Gate No 1"];
const OUTLET_LOCATIONS = ["Southern Stories", "Hotspot", "Snapeats", "Kathi Junction", "Dominos", "Subway"];
const COURIER_COMPANIES = ["EKart Logistics", "BlueDart", "Amazon Shipping", "ShadowFax", "Express News", "SafeXpress"];

const ADMIN_USER_ID = "admin-001";
const PLATFORM_FEE_PCT = 0.20;
const GST_RATE = 0.18;

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

async function getOrCreateWallet(userId: string) {
  let ws = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  if (!ws.length) {
    const walletId = generateId();
    await db.insert(walletsTable).values({ id: walletId, userId, balance: "0", currency: "INR" });
    ws = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  }
  return ws[0];
}

async function creditWallet(userId: string, amount: number, description: string, orderId?: string, orderType?: string) {
  const w = await getOrCreateWallet(userId);
  await db.update(walletsTable).set({ balance: sql`${walletsTable.balance} + ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, userId));
  await db.insert(transactionsTable).values({ id: generateId(), walletId: w.id, type: "credit", amount: amount.toFixed(2), description, status: "completed", orderId, orderType });
}

async function debitWallet(userId: string, amount: number, description: string, orderId?: string, orderType?: string) {
  const w = await getOrCreateWallet(userId);
  if (parseFloat(w.balance) < amount) throw new Error("InsufficientBalance");
  await db.update(walletsTable).set({ balance: sql`${walletsTable.balance} - ${amount}`, updatedAt: new Date() }).where(eq(walletsTable.userId, userId));
  await db.insert(transactionsTable).values({ id: generateId(), walletId: w.id, type: "debit", amount: amount.toFixed(2), description, status: "completed", orderId, orderType });
}

// ─── Assignments ──────────────────────────────────────────────────────────────

router.get("/assignments", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    let rows = await db.select().from(assignmentsTable).orderBy(desc(assignmentsTable.createdAt));

    // Students only see assignments matching their program/year, BUT always include
    // any listing they personally booked (legacy bookedById model)
    if (me.role === "student" && me.program && me.year) {
      rows = rows.filter(a =>
        (a.program === me.program && a.targetYear === me.year) ||
        a.bookedById === userId
      );
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
    const existing = await db.select().from(serviceBookingsTable)
      .where(and(eq(serviceBookingsTable.listingId, id), eq(serviceBookingsTable.studentId, userId)))
      .limit(1);
    if (existing.length && !["delivered", "dismissed"].includes(existing[0].status)) {
      res.status(400).json({ error: "AlreadyBooked", message: "You already have an active booking for this listing" }); return;
    }
    const listingPrice = parseFloat(rows[0].price as unknown as string);
    const gstAmount = parseFloat((listingPrice * GST_RATE).toFixed(2));
    const totalPaid = parseFloat((listingPrice + gstAmount).toFixed(2));
    const wallet = await getOrCreateWallet(userId);
    if (parseFloat(wallet.balance) < totalPaid) {
      res.status(400).json({ error: "InsufficientBalance", message: `Insufficient wallet balance. Required: ₹${totalPaid.toFixed(2)}, Available: ₹${parseFloat(wallet.balance).toFixed(2)}` }); return;
    }
    const bookingId = generateId();
    const history = appendHistory(null, "booked");
    await debitWallet(userId, totalPaid, `Assignment booking: ${rows[0].title ?? id}`, bookingId, "booking");
    await db.insert(serviceBookingsTable).values({
      id: bookingId, serviceType: "assignments", listingId: id,
      studentId: userId, status: "booked", statusHistory: history,
      price: listingPrice.toFixed(2), gstAmount: gstAmount.toFixed(2),
      totalPaid: totalPaid.toFixed(2), escrowStatus: "held",
    });
    const booking = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, bookingId)).limit(1);
    const listing = rows[0];
    res.json({ ...booking[0], listing: { ...listing, poster: await safeUser(listing.posterId) }, student: await safeUser(userId) });
    try {
      const student = await safeUser(userId);
      await notifyUser(listing.posterId, {
        type: "new_booking",
        title: "📚 New Assignment Booking!",
        body: `${student?.name ?? "A student"} just booked your assignment. Act now!`,
        data: { screen: "/(tabs)/services", tab: "assignments", itemId: bookingId },
      });
    } catch {}
  } catch (err: any) {
    console.error(err);
    if (err.message === "InsufficientBalance") { res.status(400).json({ error: "InsufficientBalance" }); return; }
    res.status(500).json({ error: "ServerError", message: "Failed to book assignment" });
  }
});

// ─── Legacy listing-level status endpoints (for old-model data without service_bookings) ──
// Allows providers/students to advance status on listings that predate the multi-booking model.

router.post("/assignments/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the provider can accept" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(assignmentsTable).set({ status: "accepted", statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/assignments/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the provider can update progress" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from current status" }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(assignmentsTable).set({ status: nextStatus, statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
    try { if (updated[0].bookedById) await notifyUser(updated[0].bookedById, { type: "booking_status", title: "📚 Assignment Updated", body: `Your assignment status is now: ${nextStatus}.`, data: { screen: "/(tabs)/services" } }); } catch {}
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/assignments/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Must be completed first" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the student can confirm" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(assignmentsTable).set({ status: "delivered", statusHistory: history }).where(eq(assignmentsTable.id, id));
    const updated = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

// ─── Certifications ───────────────────────────────────────────────────────────

router.get("/certifications", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    let rows = await db.select().from(certificationsTable).orderBy(desc(certificationsTable.createdAt));

    // Students only see certs for their program/year, BUT always include
    // any listing they personally booked (legacy bookedById model)
    if (me.role === "student" && me.program && me.year) {
      rows = rows.filter(c =>
        (c.program === me.program && c.targetYear === me.year) ||
        c.bookedById === userId
      );
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
    const existing = await db.select().from(serviceBookingsTable)
      .where(and(eq(serviceBookingsTable.listingId, id), eq(serviceBookingsTable.studentId, userId)))
      .limit(1);
    if (existing.length && !["delivered", "dismissed"].includes(existing[0].status)) {
      res.status(400).json({ error: "AlreadyBooked", message: "You already have an active booking for this listing" }); return;
    }
    const listingPrice = parseFloat(rows[0].price as unknown as string);
    const gstAmount = parseFloat((listingPrice * GST_RATE).toFixed(2));
    const totalPaid = parseFloat((listingPrice + gstAmount).toFixed(2));
    const wallet = await getOrCreateWallet(userId);
    if (parseFloat(wallet.balance) < totalPaid) {
      res.status(400).json({ error: "InsufficientBalance", message: `Insufficient wallet balance. Required: ₹${totalPaid.toFixed(2)}, Available: ₹${parseFloat(wallet.balance).toFixed(2)}` }); return;
    }
    const bookingId = generateId();
    const history = appendHistory(null, "booked");
    await debitWallet(userId, totalPaid, `Certification booking: ${rows[0].title ?? id}`, bookingId, "booking");
    await db.insert(serviceBookingsTable).values({
      id: bookingId, serviceType: "certifications", listingId: id,
      studentId: userId, status: "booked", statusHistory: history,
      price: listingPrice.toFixed(2), gstAmount: gstAmount.toFixed(2),
      totalPaid: totalPaid.toFixed(2), escrowStatus: "held",
    });
    const booking = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, bookingId)).limit(1);
    res.json({ ...booking[0], listing: { ...rows[0], poster: await safeUser(rows[0].posterId) }, student: await safeUser(userId) });
    try {
      const student = await safeUser(userId);
      await notifyUser(rows[0].posterId, {
        type: "new_booking",
        title: "🏆 New Certification Booking!",
        body: `${student?.name ?? "A student"} just booked your certification course. Act now!`,
        data: { screen: "/(tabs)/services", tab: "certifications", itemId: bookingId },
      });
    } catch {}
  } catch (err: any) {
    console.error(err);
    if (err.message === "InsufficientBalance") { res.status(400).json({ error: "InsufficientBalance" }); return; }
    res.status(500).json({ error: "ServerError", message: "Failed to book certification" });
  }
});

router.post("/certifications/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the provider can accept" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(certificationsTable).set({ status: "accepted", statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/certifications/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the provider can update progress" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from current status" }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(certificationsTable).set({ status: nextStatus, statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
    try { if (updated[0].bookedById) await notifyUser(updated[0].bookedById, { type: "booking_status", title: "🏆 Certification Updated", body: `Your certification status is now: ${nextStatus}.`, data: { screen: "/(tabs)/services" } }); } catch {}
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/certifications/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Must be completed first" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the student can confirm" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(certificationsTable).set({ status: "delivered", statusHistory: history }).where(eq(certificationsTable.id, id));
    const updated = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
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

    // Students see their own requests; providers see: pending (marketplace) + ones they accepted (agent) + ones they requested themselves
    if (me.role === "student") {
      rows = rows.filter(d => d.requesterId === userId);
    } else if (me.role === "provider") {
      rows = rows.filter(d =>
        d.status === "pending" ||
        d.deliveryAgentId === userId ||
        d.requesterId === userId
      );
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
    const delivery = rows[0];
    res.status(201).json({ ...delivery, requester: await safeUser(userId), deliveryAgent: null });

    // Notify all providers of the new delivery request (async, after response sent)
    try {
      const me = await safeUser(userId);
      const providers = await db.select({ id: usersTable.id })
        .from(usersTable).where(eq(usersTable.role, "provider"));
      const providerIds = providers.map((p: any) => p.id).filter((pid: string) => pid !== userId);
      const pickupLabel = delivery.pickupType === "outlet"
        ? delivery.pickupLocation
        : delivery.pickupLocation;
      await notifyUsers(providerIds, {
        type: "new_delivery",
        title: "📦 New Delivery Request!",
        body: `Someone just posted a delivery request from ${pickupLabel}. Act now!`,
        data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
      });
    } catch {}
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
    const agent = await safeUser(userId);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: agent });
    // Notify requester
    try {
      await notifyUser(updated[0].requesterId, {
        type: "delivery_accepted",
        title: "🎉 Delivery Request Accepted!",
        body: `${agent?.name ?? "An agent"} has accepted your delivery from ${updated[0].pickupLocation}. They're on it!`,
        data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
      });
    } catch {}
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
    const agentUser = await safeUser(userId);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: agentUser });
    // Status-specific notification to requester
    try {
      const agentName = agentUser?.name ?? "Your agent";
      const pickup = updated[0].pickupLocation;
      const drop = updated[0].dropLocation;
      const msgMap: Record<string, { title: string; body: string }> = {
        reaching_pickup: { title: "🏃 Agent is on the way!", body: `${agentName} is heading to ${pickup} to pick up your order.` },
        placed_order:    { title: "✅ Order Placed!", body: `${agentName} has confirmed your payment & placed your order at ${pickup}.` },
        collecting_order:{ title: "🛍️ Collecting Your Order", body: `${agentName} is collecting your order from ${pickup}.` },
        reaching_drop:   { title: "🚚 On the Way!", body: `${agentName} is on the way to your drop location at ${drop}.` },
        completed:       { title: "📍 Agent Has Arrived!", body: `${agentName} has arrived at your location. Please confirm the item received!` },
      };
      const msg = msgMap[nextStatus];
      if (msg) {
        await notifyUser(updated[0].requesterId, {
          type: `delivery_${nextStatus}`,
          ...msg,
          data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
        });
      }
    } catch {}
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
    // Notify the delivery agent
    try {
      const requester = await safeUser(userId);
      if (updated[0].deliveryAgentId) {
        await notifyUser(updated[0].deliveryAgentId, {
          type: "payment_marked",
          title: "💳 Payment Screenshot Uploaded!",
          body: `${requester?.name ?? "The student"} has uploaded the payment screenshot. Verify now!`,
          data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
        });
      }
    } catch {}
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
    await db.update(deliveriesTable).set({ chargeStatus: "paid" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
    try {
      const agentUser = await safeUser(userId);
      await notifyUser(updated[0].requesterId, {
        type: "payment_confirmed",
        title: "✅ Payment Confirmed!",
        body: `${agentUser?.name ?? "Your agent"} confirmed your payment. Order will be placed now.`,
        data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
      });
    } catch {}
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to confirm payment" });
  }
});

router.post("/deliveries/:id/reject-payment", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can reject payment" }); return; }
    await db.update(deliveriesTable).set({ chargeStatus: "payment_rejected", paymentScreenshotUrl: null }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0] });
    try {
      const agentUser = await safeUser(userId);
      await notifyUser(updated[0].requesterId, {
        type: "payment_rejected",
        title: "❌ Payment Screenshot Rejected",
        body: `${agentUser?.name ?? "Your agent"} could not verify your payment. Please re-upload your payment screenshot.`,
        data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
      });
    } catch {}
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to reject payment" });
  }
});

router.post("/deliveries/:id/payment-screenshot", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { paymentScreenshotUrl } = req.body;
    if (!paymentScreenshotUrl) { res.status(400).json({ error: "paymentScreenshotUrl is required" }); return; }
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId !== userId) { res.status(403).json({ error: "Only the requester can upload payment screenshot" }); return; }
    await db.update(deliveriesTable).set({ paymentScreenshotUrl, chargeStatus: "screenshot_uploaded" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(userId), deliveryAgent: rows[0].deliveryAgentId ? await safeUser(rows[0].deliveryAgentId) : null });
    try {
      if (rows[0].deliveryAgentId) {
        const requesterUser = await safeUser(userId);
        await notifyUser(rows[0].deliveryAgentId, {
          type: "payment_screenshot_uploaded",
          title: "📸 Payment Screenshot Received!",
          body: `${requesterUser?.name ?? "Student"} uploaded a payment screenshot. Please confirm payment to proceed.`,
          data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
        });
      }
    } catch {}
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to upload payment screenshot" }); }
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
    const agentComp = await safeUser(userId);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: agentComp });
    try {
      await notifyUser(updated[0].requesterId, {
        type: "delivery_completed",
        title: "🎊 Hurray! Order Delivered!",
        body: `Your order has been delivered by ${agentComp?.name ?? "your agent"}. Rate them now!`,
        data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
      });
    } catch {}
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to complete delivery" });
  }
});

// Requester cancels delivery (only when status=pending, before any agent accepts)
router.post("/deliveries/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId !== userId) { res.status(403).json({ error: "Only the requester can cancel" }); return; }
    if (rows[0].status !== "pending") { res.status(400).json({ error: "Can only cancel while still pending (no agent has accepted yet)" }); return; }
    const history = appendHistory(rows[0].statusHistory, "cancelled");
    await db.update(deliveriesTable).set({ status: "cancelled", statusHistory: history, cancelledAt: new Date() }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(userId), deliveryAgent: null });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to cancel delivery" }); }
});

// Agent uploads selfie after accepting delivery (camera-only, base64)
router.post("/deliveries/:id/selfie", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { selfieUrl } = req.body;
    if (!selfieUrl) { res.status(400).json({ error: "selfieUrl is required" }); return; }
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can upload selfie" }); return; }
    await db.update(deliveriesTable).set({ selfieUrl, selfieTimestamp: new Date() }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to upload selfie" }); }
});

// Agent uploads location photo at drop point (camera-only, base64)
router.post("/deliveries/:id/location-photo", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { locationPhotoUrl } = req.body;
    if (!locationPhotoUrl) { res.status(400).json({ error: "locationPhotoUrl is required" }); return; }
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can upload location photo" }); return; }
    await db.update(deliveriesTable).set({ locationPhotoUrl, locationPhotoTimestamp: new Date() }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to upload location photo" }); }
});

// Agent uploads UPI QR image so requester can pay delivery charge
router.post("/deliveries/:id/qr", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { qrImageUrl } = req.body;
    if (!qrImageUrl) { res.status(400).json({ error: "qrImageUrl is required" }); return; }
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].deliveryAgentId !== userId) { res.status(403).json({ error: "Only the delivery agent can upload QR" }); return; }
    await db.update(deliveriesTable).set({ qrImageUrl, chargeStatus: "qr_shared" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: await safeUser(userId) });
    try {
      await notifyUser(updated[0].requesterId, {
        type: "delivery_qr_shared",
        title: "💳 Pay Delivery Charge",
        body: "Your agent shared their UPI QR. Please pay the delivery fee to complete the handover.",
        data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
      });
    } catch {}
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to upload QR" }); }
});

// Student pays delivery charge from wallet — 80% to agent, 20% to admin
router.post("/deliveries/:id/pay-delivery-charge", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].requesterId !== userId) { res.status(403).json({ error: "Only the requester can pay the delivery charge" }); return; }
    if (rows[0].chargeStatus === "paid") { res.status(400).json({ error: "Delivery charge already paid" }); return; }
    const fee = parseFloat((rows[0].deliveryFee as unknown as string) || "30");
    const wallet = await getOrCreateWallet(userId);
    if (parseFloat(wallet.balance) < fee) {
      res.status(400).json({ error: "InsufficientBalance", message: `Insufficient wallet balance. Required: ₹${fee.toFixed(2)}, Available: ₹${parseFloat(wallet.balance).toFixed(2)}` }); return;
    }
    const agentPayout = parseFloat((fee * (1 - PLATFORM_FEE_PCT)).toFixed(2));
    const platformFee = parseFloat((fee * PLATFORM_FEE_PCT).toFixed(2));
    await debitWallet(userId, fee, `Delivery fee: order #${id}`, id, "delivery");
    if (rows[0].deliveryAgentId) {
      await creditWallet(rows[0].deliveryAgentId, agentPayout, `Delivery fee received: order #${id}`, id, "delivery");
    }
    await creditWallet(ADMIN_USER_ID, platformFee, `Platform fee: delivery #${id}`, id, "delivery");
    await db.update(deliveriesTable).set({ chargeStatus: "paid" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(userId), deliveryAgent: rows[0].deliveryAgentId ? await safeUser(rows[0].deliveryAgentId) : null, agentPayout, platformFee });
    try {
      if (rows[0].deliveryAgentId) {
        await notifyUser(rows[0].deliveryAgentId, {
          type: "delivery_charge_paid",
          title: "💰 Delivery Fee Received!",
          body: `₹${agentPayout.toFixed(2)} has been credited to your wallet for delivery #${id}.`,
          data: { screen: "/(tabs)/wallet" },
        });
      }
    } catch {}
  } catch (err: any) {
    if (err.message === "InsufficientBalance") { res.status(400).json({ error: "InsufficientBalance" }); return; }
    res.status(500).json({ error: "ServerError", message: "Failed to pay delivery charge" });
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

router.post("/tasks/:id/reject", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the poster can reject" }); return; }
    await db.update(tasksTable)
      .set({ status: "open", assignedToId: null })
      .where(eq(tasksTable.id, id));
    const updated = await db.select().from(tasksTable).where(eq(tasksTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), assignedTo: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to reject task" });
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
    await db.insert(projectsTable).values({
      id, title, description, price: price.toString(), subject,
      program, targetYear: year,
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
    const existing = await db.select().from(serviceBookingsTable)
      .where(and(eq(serviceBookingsTable.listingId, id), eq(serviceBookingsTable.studentId, userId)))
      .limit(1);
    if (existing.length && !["delivered", "dismissed"].includes(existing[0].status)) {
      res.status(400).json({ error: "AlreadyBooked", message: "You already have an active booking for this listing" }); return;
    }
    const listingPrice = parseFloat(rows[0].price as unknown as string);
    const gstAmount = parseFloat((listingPrice * GST_RATE).toFixed(2));
    const totalPaid = parseFloat((listingPrice + gstAmount).toFixed(2));
    const wallet = await getOrCreateWallet(userId);
    if (parseFloat(wallet.balance) < totalPaid) {
      res.status(400).json({ error: "InsufficientBalance", message: `Insufficient wallet balance. Required: ₹${totalPaid.toFixed(2)}, Available: ₹${parseFloat(wallet.balance).toFixed(2)}` }); return;
    }
    const bookingId = generateId();
    const history = appendHistory(null, "booked");
    await debitWallet(userId, totalPaid, `Project booking: ${rows[0].title ?? id}`, bookingId, "booking");
    await db.insert(serviceBookingsTable).values({
      id: bookingId, serviceType: "projects", listingId: id,
      studentId: userId, status: "booked", statusHistory: history,
      price: listingPrice.toFixed(2), gstAmount: gstAmount.toFixed(2),
      totalPaid: totalPaid.toFixed(2), escrowStatus: "held",
    });
    const booking = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, bookingId)).limit(1);
    res.json({ ...booking[0], listing: { ...rows[0], poster: await safeUser(rows[0].posterId) }, student: await safeUser(userId) });
    try {
      const student = await safeUser(userId);
      await notifyUser(rows[0].posterId, {
        type: "new_booking",
        title: "💼 New Project Booking!",
        body: `${student?.name ?? "A student"} just booked your project. Act now!`,
        data: { screen: "/(tabs)/services", tab: "projects", itemId: bookingId },
      });
    } catch {}
  } catch (err: any) {
    console.error(err);
    if (err.message === "InsufficientBalance") { res.status(400).json({ error: "InsufficientBalance" }); return; }
    res.status(500).json({ error: "ServerError", message: "Failed to book project" });
  }
});

router.post("/projects/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the provider can accept" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(projectsTable).set({ status: "accepted", statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/projects/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].posterId !== userId) { res.status(403).json({ error: "Only the provider can update progress" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from current status" }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(projectsTable).set({ status: nextStatus, statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(userId), bookedBy: updated[0].bookedById ? await safeUser(updated[0].bookedById) : null });
    try { if (updated[0].bookedById) await notifyUser(updated[0].bookedById, { type: "booking_status", title: "💼 Project Updated", body: `Your project status is now: ${nextStatus}.`, data: { screen: "/(tabs)/services" } }); } catch {}
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/projects/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Must be completed first" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the student can confirm" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(projectsTable).set({ status: "delivered", statusHistory: history }).where(eq(projectsTable.id, id));
    const updated = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    res.json({ ...updated[0], poster: await safeUser(updated[0].posterId), bookedBy: await safeUser(userId) });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

// ─── Service Bookings — unified CRUD for assignments/certifications/projects ──
// Each booking lives in service_bookings; listing stays "open" for multi-booking

async function getListing(serviceType: string, listingId: string) {
  if (serviceType === "assignments") {
    const r = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, listingId)).limit(1);
    return r[0] || null;
  }
  if (serviceType === "certifications") {
    const r = await db.select().from(certificationsTable).where(eq(certificationsTable.id, listingId)).limit(1);
    return r[0] || null;
  }
  if (serviceType === "projects") {
    const r = await db.select().from(projectsTable).where(eq(projectsTable.id, listingId)).limit(1);
    return r[0] || null;
  }
  return null;
}

router.get("/bookings", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const me = await currentUser(userId);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    const activeStatuses = ["booked", "accepted", "in_progress", "completed", "rejected"];

    // ALWAYS return bookings from BOTH perspectives regardless of role:
    //   1. "lister" side — bookings on listings this user posted
    //   2. "booker" side — bookings this user made as the student
    // Any user can post academic listings (even role:student), so role must NOT gate this.

    const [myAssignments, myCertifications, myProjects] = await Promise.all([
      db.select({ id: assignmentsTable.id }).from(assignmentsTable).where(eq(assignmentsTable.posterId, userId)),
      db.select({ id: certificationsTable.id }).from(certificationsTable).where(eq(certificationsTable.posterId, userId)),
      db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.posterId, userId)),
    ]);
    const myListingIds = [
      ...myAssignments.map(a => a.id),
      ...myCertifications.map(c => c.id),
      ...myProjects.map(p => p.id),
    ];

    // Bookings on my own listings (I am the service provider)
    const listerBookings = myListingIds.length > 0
      ? await db.select().from(serviceBookingsTable)
          .where(and(
            inArray(serviceBookingsTable.listingId, myListingIds),
            inArray(serviceBookingsTable.status, activeStatuses)
          ))
          .orderBy(desc(serviceBookingsTable.createdAt))
      : [];

    // Bookings I personally made (I am the student/customer)
    const bookerBookings = await db.select().from(serviceBookingsTable)
      .where(and(
        eq(serviceBookingsTable.studentId, userId),
        inArray(serviceBookingsTable.status, activeStatuses)
      ))
      .orderBy(desc(serviceBookingsTable.createdAt));

    // Merge and deduplicate (same booking can't appear from both sides — you can't book your own listing)
    const seenIds = new Set<string>();
    const allBookings: any[] = [];
    for (const b of [...listerBookings, ...bookerBookings]) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        // Tag each booking with the user's perspective
        allBookings.push({ ...b, _myPerspective: b.studentId === userId ? "booker" : "lister" });
      }
    }

    // Attach listing and user data
    const formatted = await Promise.all(allBookings.map(async (b: any) => {
      const listing = await getListing(b.serviceType, b.listingId);
      return {
        ...b,
        _type: b.serviceType,
        listing: listing ? { ...listing, poster: await safeUser(listing.posterId) } : null,
        student: await safeUser(b.studentId),
      };
    }));

    res.json({ bookings: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to get bookings" });
  }
});

router.post("/bookings/:id/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    const listing = await getListing(rows[0].serviceType, rows[0].listingId);
    if (!listing || listing.posterId !== userId) { res.status(403).json({ error: "Only the provider can accept" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status" }); return; }
    const history = appendHistory(rows[0].statusHistory, "accepted");
    await db.update(serviceBookingsTable).set({ status: "accepted", statusHistory: history }).where(eq(serviceBookingsTable.id, id));
    const updated = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    const providerUser = await safeUser(userId);
    res.json({ ...updated[0], _type: updated[0].serviceType, listing: { ...listing, poster: providerUser }, student: await safeUser(updated[0].studentId) });
    try {
      const typeLabel = updated[0].serviceType === "assignments" ? "assignment" : updated[0].serviceType === "certifications" ? "certification course" : "project";
      await notifyUser(updated[0].studentId, {
        type: "booking_accepted",
        title: "🎉 Booking Accepted!",
        body: `${providerUser?.name ?? "The provider"} accepted your ${typeLabel} booking. Work has started!`,
        data: { screen: "/(tabs)/services", tab: updated[0].serviceType, itemId: id },
      });
    } catch {}
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to accept booking" }); }
});

router.post("/bookings/:id/reject", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    const listing = await getListing(rows[0].serviceType, rows[0].listingId);
    if (!listing || listing.posterId !== userId) { res.status(403).json({ error: "Only the provider can reject" }); return; }
    if (rows[0].status !== "booked") { res.status(400).json({ error: "Must be in booked status to reject" }); return; }
    const history = appendHistory(rows[0].statusHistory, "rejected");
    await db.update(serviceBookingsTable).set({ status: "rejected", statusHistory: history, escrowStatus: "refunded" }).where(eq(serviceBookingsTable.id, id));
    // Auto-refund: credit back totalPaid to student wallet
    const totalPaid = parseFloat((rows[0].totalPaid as unknown as string) || "0");
    if (totalPaid > 0) {
      const typeLabel = rows[0].serviceType === "assignments" ? "Assignment" : rows[0].serviceType === "certifications" ? "Certification" : "Project";
      await creditWallet(rows[0].studentId, totalPaid, `Refund: ${typeLabel} booking rejected by provider`, id, "booking");
    }
    res.json({ message: "Booking rejected", refundAmount: totalPaid });
    try {
      const typeLabel = rows[0].serviceType === "assignments" ? "assignment" : rows[0].serviceType === "certifications" ? "certification course" : "project";
      const providerU = await safeUser(userId);
      await notifyUser(rows[0].studentId, {
        type: "booking_rejected",
        title: "❌ Booking Rejected — Refund Issued",
        body: `${providerU?.name ?? "The provider"} rejected your ${typeLabel} booking. ₹${totalPaid.toFixed(2)} has been refunded to your wallet.`,
        data: { screen: "/(tabs)/services", tab: rows[0].serviceType, itemId: id },
      });
    } catch {}
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to reject booking" }); }
});

router.post("/bookings/:id/progress", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    const listing = await getListing(rows[0].serviceType, rows[0].listingId);
    if (!listing || listing.posterId !== userId) { res.status(403).json({ error: "Only the provider can update status" }); return; }
    const next: Record<string, string> = { accepted: "in_progress", in_progress: "completed" };
    const nextStatus = next[rows[0].status];
    if (!nextStatus) { res.status(400).json({ error: "Cannot advance from status: " + rows[0].status }); return; }
    const history = appendHistory(rows[0].statusHistory, nextStatus);
    await db.update(serviceBookingsTable).set({ status: nextStatus, statusHistory: history }).where(eq(serviceBookingsTable.id, id));
    const updated = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    const provProg = await safeUser(userId);
    res.json({ ...updated[0], _type: updated[0].serviceType, listing: { ...listing, poster: provProg }, student: await safeUser(updated[0].studentId) });
    try {
      const typeLabel = updated[0].serviceType === "assignments" ? "assignment" : updated[0].serviceType === "certifications" ? "certification course" : "project";
      const progressMsg: Record<string, { title: string; body: string }> = {
        in_progress: { title: "🔨 Work Started!", body: `${provProg?.name ?? "The provider"} has started working on your ${typeLabel}.` },
        completed:   { title: "✅ Work Completed!", body: `${provProg?.name ?? "The provider"} has completed your ${typeLabel}. Please confirm to release payment.` },
      };
      const msg = progressMsg[nextStatus];
      if (msg) {
        await notifyUser(updated[0].studentId, {
          type: `booking_${nextStatus}`,
          ...msg,
          data: { screen: "/(tabs)/services", tab: updated[0].serviceType, itemId: id },
        });
      }
    } catch {}
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to update booking status" }); }
});

router.post("/bookings/:id/confirm", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].studentId !== userId) { res.status(403).json({ error: "Only the student can confirm" }); return; }
    if (rows[0].status !== "completed") { res.status(400).json({ error: "Provider must mark as completed first" }); return; }
    const history = appendHistory(rows[0].statusHistory, "delivered");
    await db.update(serviceBookingsTable).set({ status: "delivered", statusHistory: history, escrowStatus: "released" }).where(eq(serviceBookingsTable.id, id));
    const updated = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    const listing = await getListing(updated[0].serviceType, updated[0].listingId);
    // Release 80% of price to provider, 20% stays as platform fee
    const price = parseFloat((rows[0].price as unknown as string) || "0");
    if (price > 0 && listing) {
      const providerPayout = parseFloat((price * (1 - PLATFORM_FEE_PCT)).toFixed(2));
      const platformFee = parseFloat((price * PLATFORM_FEE_PCT).toFixed(2));
      const typeLabel = updated[0].serviceType === "assignments" ? "Assignment" : updated[0].serviceType === "certifications" ? "Certification" : "Project";
      await creditWallet(listing.posterId, providerPayout, `${typeLabel} payment: booking #${id}`, id, "booking");
      await creditWallet(ADMIN_USER_ID, platformFee, `Platform fee: ${typeLabel} booking #${id}`, id, "booking");
    }
    res.json({ ...updated[0], _type: updated[0].serviceType, listing: listing ? { ...listing, poster: await safeUser(listing.posterId) } : null, student: await safeUser(userId) });
    try {
      if (listing) {
        const studentU = await safeUser(userId);
        const providerPayout = price > 0 ? parseFloat((price * (1 - PLATFORM_FEE_PCT)).toFixed(2)) : 0;
        const typeLabel = updated[0].serviceType === "assignments" ? "assignment" : updated[0].serviceType === "certifications" ? "certification course" : "project";
        await notifyUser(listing.posterId, {
          type: "booking_confirmed",
          title: "💰 Payment Released!",
          body: `${studentU?.name ?? "The student"} confirmed your ${typeLabel}. ₹${providerPayout.toFixed(2)} credited to your wallet!`,
          data: { screen: "/(tabs)/wallet", itemId: id },
        });
      }
    } catch {}
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to confirm booking" }); }
});

// ─── Legacy listing-level dismiss (for synthetic bookings — old-model listings with rejected status) ──
// Resets the listing back to "open" so it's available for others to book again.

router.post("/assignments/:id/dismiss", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the booked student can dismiss" }); return; }
    if (rows[0].status !== "rejected") { res.status(400).json({ error: "Listing is not in rejected status" }); return; }
    await db.update(assignmentsTable).set({ status: "open", bookedById: null, statusHistory: null }).where(eq(assignmentsTable.id, id));
    res.json({ message: "Booking dismissed, listing reopened" });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/certifications/:id/dismiss", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(certificationsTable).where(eq(certificationsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the booked student can dismiss" }); return; }
    if (rows[0].status !== "rejected") { res.status(400).json({ error: "Listing is not in rejected status" }); return; }
    await db.update(certificationsTable).set({ status: "open", bookedById: null, statusHistory: null }).where(eq(certificationsTable.id, id));
    res.json({ message: "Booking dismissed, listing reopened" });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/projects/:id/dismiss", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].bookedById !== userId) { res.status(403).json({ error: "Only the booked student can dismiss" }); return; }
    if (rows[0].status !== "rejected") { res.status(400).json({ error: "Listing is not in rejected status" }); return; }
    await db.update(projectsTable).set({ status: "open", bookedById: null, statusHistory: null }).where(eq(projectsTable.id, id));
    res.json({ message: "Booking dismissed, listing reopened" });
  } catch (err) { console.error(err); res.status(500).json({ error: "ServerError" }); }
});

router.post("/bookings/:id/dismiss-rejection", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    if (rows[0].studentId !== userId) { res.status(403).json({ error: "Only the student can dismiss" }); return; }
    if (rows[0].status !== "rejected") { res.status(400).json({ error: "Not in rejected status" }); return; }
    await db.update(serviceBookingsTable).set({ status: "dismissed", statusHistory: appendHistory(rows[0].statusHistory, "dismissed") }).where(eq(serviceBookingsTable.id, id));
    res.json({ message: "Rejected booking dismissed" });
  } catch (err) { res.status(500).json({ error: "ServerError", message: "Failed to dismiss" }); }
});

export default router;
