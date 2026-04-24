import { Router } from "express";
import { db } from "@workspace/db";
import {
  assignmentsTable, certificationsTable, deliveriesTable, outletItemsTable,
  tasksTable, taskApplicationsTable, projectsTable, usersTable, serviceBookingsTable,
  walletsTable, transactionsTable,
  type Assignment, type Certification, type Project, type ServiceBooking,
} from "@workspace/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";
import { notifyUser, notifyUsers } from "../lib/pushNotifications";
import { deleteOrderMessages } from "./order-chat";

const router = Router();

const PROGRAMS = ["BCA", "BTech", "MBA", "MTech", "BSc", "BCom", "BA", "Other"];
const GATE_LOCATIONS = ["Gate No 3", "Gate No 1"];
const OUTLET_LOCATIONS = ["Southern Stories", "Hotspot", "Snapeats", "Kathi Junction", "Dominos", "Subway"];
const COURIER_COMPANIES = ["EKart Logistics", "BlueDart", "Amazon Shipping", "ShadowFax", "Express News", "SafeXpress"];

const ADMIN_USER_ID = "admin-001";
const PLATFORM_FEE_PCT = 0.20;
const GST_RATE = 0.18;

// Exclude large base64 image columns from list queries (they can be 5-10MB each)
const DELIVERY_LIST_COLS = {
  id: deliveriesTable.id,
  requesterId: deliveriesTable.requesterId,
  deliveryAgentId: deliveriesTable.deliveryAgentId,
  pickupType: deliveriesTable.pickupType,
  pickupLocation: deliveriesTable.pickupLocation,
  dropLocation: deliveriesTable.dropLocation,
  websiteName: deliveriesTable.websiteName,
  courierCompany: deliveriesTable.courierCompany,
  orderCustomerName: deliveriesTable.orderCustomerName,
  orderId: deliveriesTable.orderId,
  orderMobile: deliveriesTable.orderMobile,
  foodItems: deliveriesTable.foodItems,
  subtotal: deliveriesTable.subtotal,
  deliveryFee: deliveriesTable.deliveryFee,
  status: deliveriesTable.status,
  statusHistory: deliveriesTable.statusHistory,
  paymentTimerStartedAt: deliveriesTable.paymentTimerStartedAt,
  paymentMarkedAt: deliveriesTable.paymentMarkedAt,
  selfieTimestamp: deliveriesTable.selfieTimestamp,
  locationPhotoTimestamp: deliveriesTable.locationPhotoTimestamp,
  chargeStatus: deliveriesTable.chargeStatus,
  cancelledAt: deliveriesTable.cancelledAt,
  ratingHappiness: deliveriesTable.ratingHappiness,
  ratingHandling: deliveriesTable.ratingHandling,
  ratingOnTime: deliveriesTable.ratingOnTime,
  ratingComment: deliveriesTable.ratingComment,
  createdAt: deliveriesTable.createdAt,
  // EXCLUDED: selfieUrl, locationPhotoUrl, qrImageUrl, paymentScreenshotUrl (large base64 blobs)
};

async function safeUser(userId: string) {
  const map = await safeUserBatch([userId]);
  return map.get(userId) || null;
}

const _userCache = new Map<string, { data: any; exp: number }>();
const USER_TTL = 5 * 60_000;

async function safeUserBatch(userIds: (string | null | undefined)[]): Promise<Map<string, any>> {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return new Map();
  const result = new Map<string, any>();
  const now = Date.now();
  const toFetch: string[] = [];
  for (const id of ids) {
    const c = _userCache.get(id);
    if (c && c.exp > now) { result.set(id, c.data); } else { toFetch.push(id); }
  }
  if (toFetch.length) {
    const users = await db.select().from(usersTable).where(inArray(usersTable.id, toFetch));
    const exp = now + USER_TTL;
    for (const u of users) {
      const { passwordHash: _, ...rest } = u;
      _userCache.set(u.id, { data: rest, exp });
      result.set(u.id, rest);
    }
  }
  return result;
}

async function currentUser(userId: string) {
  return safeUser(userId);
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

// ─── Combined /all endpoint ────────────────────────────────────────────────────

router.get("/all", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const activeStatuses = ["booked", "accepted", "in_progress", "completed", "rejected"];

    // ── Wave 1: everything in parallel ──────────────────────────────────────
    const [
      me,
      assignmentRows, certificationRows, deliveryRows, taskRows, projectRows,
      myAssignmentIds, myCertificationIds, myProjectIds,
      bookerBookingsRaw,
    ] = await Promise.all([
      currentUser(userId),
      db.select().from(assignmentsTable).orderBy(desc(assignmentsTable.createdAt)),
      db.select().from(certificationsTable).orderBy(desc(certificationsTable.createdAt)),
      db.select(DELIVERY_LIST_COLS).from(deliveriesTable).orderBy(desc(deliveriesTable.createdAt)),
      db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt)),
      db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt)),
      db.select({ id: assignmentsTable.id }).from(assignmentsTable).where(eq(assignmentsTable.posterId, userId)),
      db.select({ id: certificationsTable.id }).from(certificationsTable).where(eq(certificationsTable.posterId, userId)),
      db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.posterId, userId)),
      db.select().from(serviceBookingsTable)
        .where(and(eq(serviceBookingsTable.studentId, userId), inArray(serviceBookingsTable.status, activeStatuses)))
        .orderBy(desc(serviceBookingsTable.createdAt)),
    ]);

    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

    // ── In-memory filtering ─────────────────────────────────────────────────
    let filteredAssignments = assignmentRows;
    let filteredCertifications = certificationRows;
    let filteredDeliveries = deliveryRows;
    if (me.role === "student" && me.program && me.year) {
      filteredAssignments = assignmentRows.filter(a =>
        (a.program === me.program && a.targetYear === me.year) || a.bookedById === userId
      );
      filteredCertifications = certificationRows.filter(c =>
        (c.program === me.program && c.targetYear === me.year) || c.bookedById === userId
      );
    }
    if (me.role === "student") {
      filteredDeliveries = deliveryRows.filter(d => d.requesterId === userId);
    } else if (me.role === "provider") {
      filteredDeliveries = deliveryRows.filter(d =>
        d.status === "pending" || d.deliveryAgentId === userId || d.requesterId === userId
      );
    }

    const myListingIds = [
      ...myAssignmentIds.map(a => a.id),
      ...myCertificationIds.map(c => c.id),
      ...myProjectIds.map(p => p.id),
    ];

    // ── Wave 2: lister bookings (needs myListingIds from wave 1) ────────────
    const listerBookingsRaw = myListingIds.length > 0
      ? await db.select().from(serviceBookingsTable)
          .where(and(inArray(serviceBookingsTable.listingId, myListingIds), inArray(serviceBookingsTable.status, activeStatuses)))
          .orderBy(desc(serviceBookingsTable.createdAt))
      : [] as any[];

    // ── Wave 3: ALL user lookups in one batch (has all booking IDs now) ──────
    const userMap = await safeUserBatch([
      ...filteredAssignments.map(a => a.posterId), ...filteredAssignments.map(a => a.bookedById),
      ...filteredCertifications.map(c => c.posterId), ...filteredCertifications.map(c => c.bookedById),
      ...filteredDeliveries.map(d => d.requesterId), ...filteredDeliveries.map(d => d.deliveryAgentId),
      ...taskRows.map(t => t.posterId), ...taskRows.map(t => t.assignedToId),
      ...projectRows.map(p => p.posterId), ...projectRows.map(p => p.bookedById),
      ...bookerBookingsRaw.map(b => b.studentId),
      ...listerBookingsRaw.map((b: any) => b.studentId),
    ]);

    // ── In-memory formatting (zero extra DB queries) ─────────────────────────
    const assignments    = filteredAssignments.map(a => ({ ...a, poster: userMap.get(a.posterId) || null, bookedBy: a.bookedById ? userMap.get(a.bookedById) || null : null }));
    const certifications = filteredCertifications.map(c => ({ ...c, poster: userMap.get(c.posterId) || null, bookedBy: c.bookedById ? userMap.get(c.bookedById) || null : null }));
    const deliveries     = filteredDeliveries.map(d => ({ ...d, requester: userMap.get(d.requesterId) || null, deliveryAgent: d.deliveryAgentId ? userMap.get(d.deliveryAgentId) || null : null }));
    const tasks          = taskRows.map(t => ({ ...t, poster: userMap.get(t.posterId) || null, assignedTo: t.assignedToId ? userMap.get(t.assignedToId) || null : null }));
    const projects       = projectRows.map(p => ({ ...p, poster: userMap.get(p.posterId) || null, bookedBy: p.bookedById ? userMap.get(p.bookedById) || null : null }));

    // Build in-memory listing lookup — no extra DB queries
    const listingIndex = new Map<string, any>();
    for (const a of assignmentRows) listingIndex.set(`assignments:${a.id}`, { ...a, poster: userMap.get(a.posterId) || null });
    for (const c of certificationRows) listingIndex.set(`certifications:${c.id}`, { ...c, poster: userMap.get(c.posterId) || null });
    for (const p of projectRows) listingIndex.set(`projects:${p.id}`, { ...p, poster: userMap.get(p.posterId) || null });

    const seenIds = new Set<string>();
    const bookings: any[] = [];
    for (const b of [...listerBookingsRaw, ...bookerBookingsRaw]) {
      if (seenIds.has(b.id)) continue;
      seenIds.add(b.id);
      const listing = listingIndex.get(`${b.serviceType}:${b.listingId}`) || null;
      bookings.push({
        ...b,
        _type: b.serviceType,
        _myPerspective: b.studentId === userId ? "booker" : "lister",
        listing,
        student: userMap.get(b.studentId) || null,
      });
    }

    // Add lister booking poster user IDs to userMap if not already there (they were included above)
    res.json({ assignments, certifications, deliveries, tasks, projects, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to load services" });
  }
});

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

    const userMap = await safeUserBatch([...rows.map(a => a.posterId), ...rows.map(a => a.bookedById)]);
    const formatted = rows.map(a => ({
      ...a,
      poster: userMap.get(a.posterId) || null,
      bookedBy: a.bookedById ? userMap.get(a.bookedById) || null : null,
    }));
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
    deleteOrderMessages(id).catch(() => {});
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

    const userMap = await safeUserBatch([...rows.map(c => c.posterId), ...rows.map(c => c.bookedById)]);
    const formatted = rows.map(c => ({
      ...c,
      poster: userMap.get(c.posterId) || null,
      bookedBy: c.bookedById ? userMap.get(c.bookedById) || null : null,
    }));
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
    deleteOrderMessages(id).catch(() => {});
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

    let rows = await db.select(DELIVERY_LIST_COLS).from(deliveriesTable).orderBy(desc(deliveriesTable.createdAt));

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

    const userMap = await safeUserBatch([...rows.map(d => d.requesterId), ...rows.map(d => d.deliveryAgentId)]);
    const formatted = rows.map(d => ({
      ...d,
      requester: userMap.get(d.requesterId) || null,
      deliveryAgent: d.deliveryAgentId ? userMap.get(d.deliveryAgentId) || null : null,
    }));
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
    const deliveryFee = "30"; // ₹30 for both gate and outlet

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

router.get("/deliveries/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const rows = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "NotFound" }); return; }
    const d = rows[0];
    const userMap = await safeUserBatch([d.requesterId, d.deliveryAgentId]);
    res.json({
      ...d,
      requester: userMap.get(d.requesterId) || null,
      deliveryAgent: d.deliveryAgentId ? userMap.get(d.deliveryAgentId) || null : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError" });
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
    const updated = await db.update(deliveriesTable).set({
      deliveryAgentId: userId,
      status: "accepted",
      statusHistory: history,
    }).where(eq(deliveriesTable.id, id)).returning();
    const [agent, requester] = await Promise.all([safeUser(userId), safeUser(updated[0].requesterId)]);
    res.json({ ...updated[0], requester, deliveryAgent: agent });
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
    // On arrival at drop (completed): always reset chargeStatus + locationPhoto — agent takes fresh photo, student pays delivery charge
    const progressUpdates: any = { status: nextStatus, statusHistory: history };
    if (nextStatus === "completed") {
      progressUpdates.chargeStatus = "pending";
      progressUpdates.locationPhotoUrl = null;
      progressUpdates.locationPhotoTimestamp = null;
    }
    const updated = await db.update(deliveriesTable).set(progressUpdates).where(eq(deliveriesTable.id, id)).returning();
    const [agentUser, requesterUser] = await Promise.all([safeUser(userId), safeUser(updated[0].requesterId)]);
    res.json({ ...updated[0], requester: requesterUser, deliveryAgent: agentUser });
    // Status-specific notification to requester
    try {
      const agentName = agentUser?.name ?? "Your agent";
      const pickup = updated[0].pickupLocation;
      const drop = updated[0].dropLocation;
      // "completed" notification differs: gate needs payment, outlet just needs confirmation
      const completedMsg = isOutlet
        ? { title: "📍 Agent Has Arrived!", body: `${agentName} has arrived at your location. Taking location photo & will hand over your food shortly.` }
        : { title: "📍 Agent Has Arrived!", body: `${agentName} is at your location. They will take a selfie, then you pay the delivery charge to receive your parcel.` };
      const msgMap: Record<string, { title: string; body: string }> = {
        reaching_pickup: { title: "🏃 Agent is on the way!", body: `${agentName} is heading to ${pickup} to pick up your order.` },
        placed_order:    { title: "✅ Order Placed!", body: `${agentName} has confirmed your payment & placed your order at ${pickup}.` },
        collecting_order:{ title: "🛍️ Collecting Your Order", body: `${agentName} is collecting your order from ${pickup}.` },
        reaching_drop:   { title: "🚚 On the Way!", body: `${agentName} is on the way to your drop location at ${drop}.` },
        completed:       completedMsg,
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
    // Gate deliveries: delivery charge must be paid before marking received
    if (rows[0].chargeStatus !== "paid") {
      res.status(400).json({ error: "PaymentRequired", message: "Please pay the delivery charge before marking the order as received." }); return;
    }

    // Verify the student actually paid via wallet — defense-in-depth in case chargeStatus was flipped without an actual debit.
    // Without this, a malicious or buggy /confirm-payment call could let the agent receive payout without the student being debited.
    const studentDebit = await db.select({ id: transactionsTable.id }).from(transactionsTable)
      .where(and(
        eq(transactionsTable.orderId, id),
        eq(transactionsTable.orderType, "delivery"),
        eq(transactionsTable.type, "debit"),
      ))
      .limit(1);
    if (!studentDebit.length) {
      res.status(400).json({ error: "PaymentMissing", message: "No record of your delivery charge payment. Please pay the delivery charge first." }); return;
    }

    // Idempotent atomic transition: only the call that flips status from "completed" → "delivered" wins.
    // Concurrent calls will see 0 rows and exit without crediting twice.
    const history = appendHistory(rows[0].statusHistory, "delivered");
    const updated = await db.update(deliveriesTable)
      .set({ status: "delivered", statusHistory: history })
      .where(and(
        eq(deliveriesTable.id, id),
        eq(deliveriesTable.status, "completed"),
        eq(deliveriesTable.chargeStatus, "paid"),
      ))
      .returning();

    if (!updated.length) {
      // Someone else already confirmed (race), or status changed underneath us.
      const fresh = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
      if (fresh.length && fresh[0].status === "delivered") {
        const [requester, agent] = await Promise.all([safeUser(userId), fresh[0].deliveryAgentId ? safeUser(fresh[0].deliveryAgentId) : Promise.resolve(null)]);
        res.json({ ...fresh[0], requester, deliveryAgent: agent, agentPayout: 0, alreadyConfirmed: true });
        return;
      }
      res.status(409).json({ error: "Conflict", message: "Delivery state changed. Please refresh and retry." }); return;
    }

    // Idempotent payout release: skip if a payout txn already exists in the AGENT'S wallet for this delivery.
    // We scope by agent wallet because /pay-delivery-charge also writes a credit row for the same orderId
    // to the ADMIN wallet (platform fee + GST); without the wallet filter we'd skip every legitimate payout.
    let agentPayout = 0;
    if (updated[0].deliveryAgentId) {
      const agentWallet = await getOrCreateWallet(updated[0].deliveryAgentId);
      const existingPayout = await db.select({ id: transactionsTable.id }).from(transactionsTable)
        .where(and(
          eq(transactionsTable.walletId, agentWallet.id),
          eq(transactionsTable.orderId, id),
          eq(transactionsTable.orderType, "delivery"),
          eq(transactionsTable.type, "credit"),
        ))
        .limit(1);
      if (!existingPayout.length) {
        const fee = parseFloat((updated[0].deliveryFee as unknown as string) || "30");
        agentPayout = parseFloat((fee * (1 - PLATFORM_FEE_PCT)).toFixed(2));
        if (agentPayout > 0) {
          try {
            await creditWallet(updated[0].deliveryAgentId, agentPayout, `Delivery payout released: order #${id}`, id, "delivery");
          } catch (creditErr) {
            // Credit failed after status flip. Log loudly so we can recover manually; do not silently swallow.
            console.error("[deliveries/confirm] PAYOUT FAILED after status flip — manual recovery needed", { deliveryId: id, agentId: updated[0].deliveryAgentId, agentPayout, err: (creditErr as any)?.message });
          }
        }
      }
    }

    const [requester, agent] = await Promise.all([safeUser(userId), updated[0].deliveryAgentId ? safeUser(updated[0].deliveryAgentId) : Promise.resolve(null)]);
    res.json({ ...updated[0], requester, deliveryAgent: agent, agentPayout });
    deleteOrderMessages(id).catch(() => {});
    try {
      if (updated[0].deliveryAgentId) {
        await notifyUser(updated[0].deliveryAgentId, {
          type: "delivery_confirmed",
          title: "✅ Delivery Confirmed — Payout Released!",
          body: agentPayout > 0
            ? `${requester?.name ?? "The student"} confirmed receipt. ₹${agentPayout.toFixed(2)} has been credited to your wallet!`
            : `${requester?.name ?? "The student"} has confirmed receipt of the delivery.`,
          data: { screen: "/(tabs)/wallet", itemId: id },
        });
      }
    } catch {}
  } catch (err) {
    console.error("[deliveries/confirm] ERROR:", (err as any)?.message);
    res.status(500).json({ error: "ServerError", message: "Failed to confirm delivery" });
  }
});

router.post("/deliveries/:id/reject", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.update(deliveriesTable).set({ status: "pending", deliveryAgentId: null }).where(eq(deliveriesTable.id, id)).returning();
    res.json({ ...updated[0], requester: await safeUser(updated[0].requesterId), deliveryAgent: null });
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
    const updated = await db.update(deliveriesTable).set({ status: "payment_marked", paymentMarkedAt: new Date() }).where(eq(deliveriesTable.id, id)).returning();
    const [requester, agent] = await Promise.all([safeUser(userId), updated[0].deliveryAgentId ? safeUser(updated[0].deliveryAgentId) : Promise.resolve(null)]);
    res.json({ ...updated[0], requester, deliveryAgent: agent });
    // Notify the delivery agent
    try {
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
    const updated = await db.update(deliveriesTable).set({ chargeStatus: "paid" }).where(eq(deliveriesTable.id, id)).returning();
    const [requester, agentUser] = await Promise.all([safeUser(updated[0].requesterId), safeUser(userId)]);
    res.json({ ...updated[0], requester, deliveryAgent: agentUser });
    try {
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
    const updated = await db.update(deliveriesTable).set({ chargeStatus: "payment_rejected", paymentScreenshotUrl: null }).where(eq(deliveriesTable.id, id)).returning();
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
    const updated = await db.update(deliveriesTable).set({ paymentScreenshotUrl, chargeStatus: "screenshot_uploaded" }).where(eq(deliveriesTable.id, id)).returning();
    const [requester, deliveryAgent] = await Promise.all([safeUser(userId), updated[0].deliveryAgentId ? safeUser(updated[0].deliveryAgentId) : Promise.resolve(null)]);
    res.json({ ...updated[0], requester, deliveryAgent });
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
    // For gate deliveries: reset location photo and charge status on every arrival
    // so the provider must re-take the live photo and the requester must re-pay each time
    const isGate = rows[0].pickupType !== "outlet";
    const completeUpdates: any = { status: "completed" };
    if (isGate) {
      completeUpdates.locationPhotoUrl = null;
      completeUpdates.locationPhotoTimestamp = null;
      completeUpdates.chargeStatus = "pending";
    }
    const updated = await db.update(deliveriesTable).set(completeUpdates).where(eq(deliveriesTable.id, id)).returning();
    const [agentComp, requester] = await Promise.all([safeUser(userId), safeUser(updated[0].requesterId)]);
    res.json({ ...updated[0], requester, deliveryAgent: agentComp });
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
    const updated = await db.update(deliveriesTable).set({ status: "cancelled", statusHistory: history, cancelledAt: new Date() }).where(eq(deliveriesTable.id, id)).returning();
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
    const updated = await db.update(deliveriesTable).set({ selfieUrl, selfieTimestamp: new Date() }).where(eq(deliveriesTable.id, id)).returning();
    const [requester, deliveryAgent] = await Promise.all([safeUser(updated[0].requesterId), safeUser(userId)]);
    res.json({ ...updated[0], requester, deliveryAgent });
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
    const updated = await db.update(deliveriesTable).set({ locationPhotoUrl, locationPhotoTimestamp: new Date() }).where(eq(deliveriesTable.id, id)).returning();
    const [requester, deliveryAgent] = await Promise.all([safeUser(updated[0].requesterId), safeUser(userId)]);
    res.json({ ...updated[0], requester, deliveryAgent });
    try {
      const isGate = updated[0].pickupType !== "outlet";
      if (isGate) {
        // Gate delivery: student still needs to pay delivery charge from wallet
        const deliveryFee = parseFloat((updated[0].deliveryFee as unknown as string) || "30");
        const gst = parseFloat((deliveryFee * 0.18).toFixed(2));
        const total = parseFloat((deliveryFee + gst).toFixed(2));
        await notifyUser(updated[0].requesterId, {
          type: "delivery_arrived",
          title: "📦 Agent Arrived at Your Location!",
          body: `Your agent is at your location. Pay ₹${total.toFixed(0)} delivery charge from your wallet to receive your parcel.`,
          data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
        });
      } else {
        // Outlet delivery: payment already done — just notify to confirm receipt
        await notifyUser(updated[0].requesterId, {
          type: "delivery_arrived",
          title: "🍔 Your Food Has Arrived!",
          body: "Your food order has been delivered. Please confirm receipt.",
          data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
        });
      }
    } catch {}
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
      const subTotal = updated[0].subtotal ? parseFloat(updated[0].subtotal as unknown as string) : null;
      const amountText = subTotal ? `₹${subTotal.toFixed(0)}` : "the amount";
      await notifyUser(updated[0].requesterId, {
        type: "delivery_qr_shared",
        title: "📲 Scan & Pay for Your Order",
        body: `Your agent shared a UPI QR. Please pay ${amountText} for your food order to proceed.`,
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
    const gst = parseFloat((fee * 0.18).toFixed(2));
    const totalCharge = parseFloat((fee + gst).toFixed(2));
    const wallet = await getOrCreateWallet(userId);
    if (parseFloat(wallet.balance) < totalCharge) {
      res.status(400).json({ error: "InsufficientBalance", message: `Insufficient wallet balance. Required: ₹${totalCharge.toFixed(2)}, Available: ₹${parseFloat(wallet.balance).toFixed(2)}` }); return;
    }
    // Student pays fee + GST; agent gets 80% of base fee (HELD until student confirms receipt); admin gets 20% of base fee + full GST immediately
    const agentPayout = parseFloat((fee * (1 - PLATFORM_FEE_PCT)).toFixed(2));
    const platformRevenue = parseFloat((fee * PLATFORM_FEE_PCT + gst).toFixed(2));
    await debitWallet(userId, totalCharge, `Delivery fee + GST: order #${id}`, id, "delivery");
    // Agent payout is HELD by the platform here. It is released to the agent's wallet only when the student marks the order as received (see /deliveries/:id/confirm).
    await creditWallet(ADMIN_USER_ID, platformRevenue, `Platform fee + GST: delivery #${id}`, id, "delivery");
    await db.update(deliveriesTable).set({ chargeStatus: "paid" }).where(eq(deliveriesTable.id, id));
    const updated = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.json({ ...updated[0], requester: await safeUser(userId), deliveryAgent: rows[0].deliveryAgentId ? await safeUser(rows[0].deliveryAgentId) : null, agentPayout, platformRevenue, gst, totalCharge });
    try {
      if (rows[0].deliveryAgentId) {
        await notifyUser(rows[0].deliveryAgentId, {
          type: "delivery_charge_paid",
          title: "💳 Delivery Fee Paid!",
          body: `Student paid ₹${totalCharge.toFixed(2)} for delivery #${id}. Your ₹${agentPayout.toFixed(2)} payout will be credited once the student confirms receipt.`,
          data: { screen: "/(tabs)/services", tab: "deliveries", itemId: id },
        });
      }
    } catch {}
  } catch (err: any) {
    console.error("[pay-delivery-charge] ERROR:", err?.message, err?.code, err?.detail, err?.constraint);
    if (err.message === "InsufficientBalance") { res.status(400).json({ error: "InsufficientBalance" }); return; }
    res.status(500).json({ error: "ServerError", message: err?.message || "Failed to pay delivery charge" });
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
    const userMap = await safeUserBatch([...tasks.map(t => t.posterId), ...tasks.map(t => t.assignedToId)]);
    const formatted = tasks.map(t => ({
      ...t,
      poster: userMap.get(t.posterId) || null,
      assignedTo: t.assignedToId ? userMap.get(t.assignedToId) || null : null,
    }));
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

// Returns the provider's earnings, using the wallet transactions table as the single source of truth.
// Counts every wallet credit tied to an order (orderType IS NOT NULL) — this includes deliveries,
// assignment/certification/project bookings, and any future service that credits the wallet via creditWallet().
// Excludes wallet top-ups, peer transfers (orderType IS NULL).
router.get("/my-earnings", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
    if (!wallets.length) {
      res.json({ today: 0, yesterday: 0, thisWeek: 0, allTime: 0, total: 0, orders: 0, history: [] });
      return;
    }
    const walletId = wallets[0].id;

    // Earnings = wallet credits tied to a service order (orderType IS NOT NULL),
    // excluding refunds (where description starts with "Refund:") since those are money returning to the user as a buyer, not earned.
    const txns = await db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.walletId, walletId),
        eq(transactionsTable.type, "credit"),
        sql`${transactionsTable.orderType} IS NOT NULL`,
        sql`${transactionsTable.description} NOT ILIKE 'Refund:%'`,
      ))
      .orderBy(desc(transactionsTable.createdAt));

    // Compute day/week boundaries in IST (UTC+5:30) — the app's primary user audience is in India.
    // The server runs in UTC, so we must shift before bucketing to avoid "today" leaking ±5.5 hours.
    const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
    const nowMs = Date.now();
    // "now" expressed as if IST were UTC, so getUTC* methods return IST calendar parts.
    const istNow = new Date(nowMs + IST_OFFSET_MS);
    const istY = istNow.getUTCFullYear();
    const istM = istNow.getUTCMonth();
    const istD = istNow.getUTCDate();
    const istDayOfWeek = istNow.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const offsetToMonday = (istDayOfWeek + 6) % 7;
    // Convert IST midnight back to a real UTC instant for comparison against UTC-stored createdAt.
    const todayStartMs = Date.UTC(istY, istM, istD) - IST_OFFSET_MS;
    const yesterdayStartMs = todayStartMs - 24 * 60 * 60 * 1000;
    const weekStartMs = todayStartMs - offsetToMonday * 24 * 60 * 60 * 1000;

    let today = 0, yesterday = 0, thisWeek = 0, allTime = 0;
    for (const t of txns) {
      const amt = parseFloat((t.amount as unknown as string) || "0");
      const createdMs = t.createdAt ? new Date(t.createdAt).getTime() : NaN;
      allTime += amt;
      if (!Number.isFinite(createdMs)) continue;
      if (createdMs >= todayStartMs) today += amt;
      else if (createdMs >= yesterdayStartMs) yesterday += amt;
      if (createdMs >= weekStartMs) thisWeek += amt;
    }

    res.json({
      today: parseFloat(today.toFixed(2)),
      yesterday: parseFloat(yesterday.toFixed(2)),
      thisWeek: parseFloat(thisWeek.toFixed(2)),
      allTime: parseFloat(allTime.toFixed(2)),
      // back-compat with older mobile clients that read `total`
      total: parseFloat(allTime.toFixed(2)),
      orders: txns.length,
      history: txns.map(t => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        orderId: t.orderId,
        orderType: t.orderType,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error("[my-earnings] ERROR:", err);
    res.json({ today: 0, yesterday: 0, thisWeek: 0, allTime: 0, total: 0, orders: 0, history: [] });
  }
});

// ─── Projects ─────────────────────────────────────────────────────────────────

router.get("/projects", authMiddleware, async (req, res) => {
  try {
    const rows = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
    const userMap = await safeUserBatch([...rows.map(p => p.posterId), ...rows.map(p => p.bookedById)]);
    const formatted = rows.map(p => ({
      ...p,
      poster: userMap.get(p.posterId) || null,
      bookedBy: p.bookedById ? userMap.get(p.bookedById) || null : null,
    }));
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
    deleteOrderMessages(id).catch(() => {});
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

// ─── GET /my-history — all bookings (active + completed) for the current user ──
router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;

    // ── Academic bookings (assignments / certifications / projects) ─────────────
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

    const bookerBookingsRaw = await db.select().from(serviceBookingsTable)
      .where(eq(serviceBookingsTable.studentId, userId))
      .orderBy(desc(serviceBookingsTable.createdAt));

    const listerBookingsRaw = myListingIds.length > 0
      ? await db.select().from(serviceBookingsTable)
          .where(inArray(serviceBookingsTable.listingId, myListingIds))
          .orderBy(desc(serviceBookingsTable.createdAt))
      : ([] as ServiceBooking[]);

    type RawBooking = ServiceBooking & { _myPerspective: "booker" | "lister" };
    const seenIds = new Set<string>();
    const allRaw: RawBooking[] = [];
    for (const b of [...listerBookingsRaw, ...bookerBookingsRaw]) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        allRaw.push({ ...b, _myPerspective: b.studentId === userId ? "booker" : "lister" });
      }
    }

    type ListingRow = (Assignment | Certification | Project) & { _table: string };
    const [allAsgn, allCert, allProj] = await Promise.all([
      db.select().from(assignmentsTable),
      db.select().from(certificationsTable),
      db.select().from(projectsTable),
    ]);
    const listingIndex = new Map<string, ListingRow>();
    for (const a of allAsgn)  listingIndex.set(`assignments:${a.id}`,    { ...a, _table: "assignments" });
    for (const c of allCert)  listingIndex.set(`certifications:${c.id}`, { ...c, _table: "certifications" });
    for (const p of allProj)  listingIndex.set(`projects:${p.id}`,       { ...p, _table: "projects" });

    const userIdsNeeded: (string | null | undefined)[] = [];
    for (const b of allRaw) {
      userIdsNeeded.push(b.studentId);
      const listing = listingIndex.get(`${b.serviceType}:${b.listingId}`);
      if (listing) userIdsNeeded.push(listing.posterId);
    }

    // ── Delivery orders (as requester + as delivery agent) ────────────────────
    const [deliveriesAsRequester, deliveriesAsAgent] = await Promise.all([
      db.select(DELIVERY_LIST_COLS).from(deliveriesTable)
        .where(eq(deliveriesTable.requesterId, userId))
        .orderBy(desc(deliveriesTable.createdAt)),
      db.select(DELIVERY_LIST_COLS).from(deliveriesTable)
        .where(eq(deliveriesTable.deliveryAgentId, userId))
        .orderBy(desc(deliveriesTable.createdAt)),
    ]);

    // Collect all user IDs needed for deliveries
    const deliveryUserIds: (string | null | undefined)[] = [];
    for (const d of [...deliveriesAsRequester, ...deliveriesAsAgent]) {
      deliveryUserIds.push(d.requesterId);
      deliveryUserIds.push(d.deliveryAgentId);
    }
    userIdsNeeded.push(...deliveryUserIds);

    const userMap = await safeUserBatch(userIdsNeeded);

    // Enrich academic bookings
    const enrichedBookings = allRaw.map((b: RawBooking) => {
      const listing = listingIndex.get(`${b.serviceType}:${b.listingId}`) || null;
      const provider = listing ? (userMap.get(listing.posterId) || null) : null;
      return {
        ...b,
        _kind: "booking" as const,
        _type: b.serviceType,
        listing: listing ? { ...listing, poster: provider } : null,
        student: userMap.get(b.studentId) || null,
        provider,
      };
    });

    // Deduplicate and tag delivery orders
    const seenDeliveryIds = new Set<string>();
    const enrichedDeliveries: any[] = [];
    for (const d of [...deliveriesAsRequester, ...deliveriesAsAgent]) {
      if (seenDeliveryIds.has(d.id)) continue;
      seenDeliveryIds.add(d.id);
      enrichedDeliveries.push({
        ...d,
        _kind: "delivery" as const,
        _type: "deliveries",
        _myPerspective: d.requesterId === userId ? "requester" : "agent",
        requester: userMap.get(d.requesterId) || null,
        agent: d.deliveryAgentId ? (userMap.get(d.deliveryAgentId) || null) : null,
      });
    }

    // ── Categorise into active / completed / cancelled ─────────────────────────
    // active    = still in progress (any non-terminal status)
    // completed = successfully delivered
    // cancelled = dismissed / cancelled / rejected (visible in history tab)

    const DELIVERY_TERMINAL = new Set(["delivered", "cancelled"]);
    const BOOKING_TERMINAL  = new Set(["delivered", "dismissed", "cancelled", "rejected"]);

    const activeBookings    = enrichedBookings.filter(b => !BOOKING_TERMINAL.has(b.status));
    const completedBookings = enrichedBookings.filter(b => b.status === "delivered");
    const cancelledBookings = enrichedBookings.filter(b => BOOKING_TERMINAL.has(b.status) && b.status !== "delivered");

    const activeDeliveries    = enrichedDeliveries.filter(d => !DELIVERY_TERMINAL.has(d.status));
    const completedDeliveries = enrichedDeliveries.filter(d => d.status === "delivered");
    const cancelledDeliveries = enrichedDeliveries.filter(d => DELIVERY_TERMINAL.has(d.status) && d.status !== "delivered");

    res.json({
      active:    [...activeBookings,    ...activeDeliveries],
      completed: [...completedBookings, ...completedDeliveries],
      cancelled: [...cancelledBookings, ...cancelledDeliveries],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to load service history" });
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
