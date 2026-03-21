import { Router } from "express";
import { eq, ilike, or, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  usersTable,
  postsTable,
  commentsTable,
  transactionsTable,
  walletsTable,
  assignmentsTable,
  certificationsTable,
  deliveriesTable,
  tasksTable,
  notificationsTable,
} from "@workspace/db/schema";
import { authMiddleware, generateToken, verifyToken } from "../lib/auth";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const router = Router();

// ─── Admin Auth Middleware ─────────────────────────────────────────────────────
async function adminMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    req.adminUser = user;
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Admin Login ───────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.role !== "admin" && user.role !== "super_admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user.id);
    const { passwordHash, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard Stats ───────────────────────────────────────────────────────────
router.get("/stats", adminMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
    const [activeUsersResult] = await db.select({ count: count() }).from(usersTable)
      .where(eq(usersTable.emailVerified, true));
    const [totalPostsResult] = await db.select({ count: count() }).from(postsTable);
    const [totalTransactionsResult] = await db.select({ count: count() }).from(transactionsTable);

    const [totalOrdersResult] = await db.select({ count: count() }).from(assignmentsTable);
    const [certCount] = await db.select({ count: count() }).from(certificationsTable);
    const [deliveryCount] = await db.select({ count: count() }).from(deliveriesTable);
    const [taskCount] = await db.select({ count: count() }).from(tasksTable);

    const [pendingAssign] = await db.select({ count: count() }).from(assignmentsTable)
      .where(eq(assignmentsTable.status, "open"));
    const [pendingDelivery] = await db.select({ count: count() }).from(deliveriesTable)
      .where(eq(deliveriesTable.status, "pending"));
    const [completedAssign] = await db.select({ count: count() }).from(assignmentsTable)
      .where(eq(assignmentsTable.status, "delivered"));
    const [completedDelivery] = await db.select({ count: count() }).from(deliveriesTable)
      .where(eq(deliveriesTable.status, "delivered"));

    const [totalRevenueResult] = await db.select({ total: sum(transactionsTable.amount) }).from(transactionsTable)
      .where(eq(transactionsTable.type, "credit"));
    const [todayRevenueResult] = await db.select({ total: sum(transactionsTable.amount) }).from(transactionsTable)
      .where(and(eq(transactionsTable.type, "credit"), gte(transactionsTable.createdAt, today)));

    return res.json({
      totalUsers: Number(totalUsersResult.count),
      activeUsers: Number(activeUsersResult.count),
      totalRevenue: Number(totalRevenueResult.total || 0),
      todayRevenue: Number(todayRevenueResult.total || 0),
      totalOrders: Number(totalOrdersResult.count) + Number(certCount.count) + Number(deliveryCount.count) + Number(taskCount.count),
      pendingOrders: Number(pendingAssign.count) + Number(pendingDelivery.count),
      completedOrders: Number(completedAssign.count) + Number(completedDelivery.count),
      totalPosts: Number(totalPostsResult.count),
      totalTransactions: Number(totalTransactionsResult.count),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get("/analytics", adminMiddleware, async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const from = new Date();
    from.setDate(from.getDate() - days);

    const revenueRows = await db.execute(sql`
      SELECT DATE(created_at) as date, SUM(amount::numeric) as amount
      FROM transactions
      WHERE type = 'credit' AND created_at >= ${from}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `);

    const usersRows = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= ${from}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `);

    const assignOrdersRows = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM assignments WHERE created_at >= ${from}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `);

    const deliveryOrdersRows = await db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM deliveries WHERE created_at >= ${from}
      GROUP BY DATE(created_at) ORDER BY date ASC
    `);

    const ordersByDay = mergeOrdersByDay(
      (assignOrdersRows as any).rows || assignOrdersRows,
      (deliveryOrdersRows as any).rows || deliveryOrdersRows
    );

    const [assignRevenue] = await db.select({ total: sum(assignmentsTable.price) }).from(assignmentsTable)
      .where(eq(assignmentsTable.status, "delivered"));
    const [certRevenue] = await db.select({ total: sum(certificationsTable.price) }).from(certificationsTable)
      .where(eq(certificationsTable.status, "delivered"));
    const [deliveryRevenue] = await db.select({ total: sum(deliveriesTable.deliveryFee) }).from(deliveriesTable)
      .where(eq(deliveriesTable.status, "delivered"));
    const [taskRevenue] = await db.select({ total: sum(tasksTable.budget) }).from(tasksTable)
      .where(eq(tasksTable.status, "completed"));

    return res.json({
      revenueByDay: formatRows((revenueRows as any).rows || revenueRows, "date", "amount"),
      usersByDay: formatRows((usersRows as any).rows || usersRows, "date", "count"),
      ordersByDay,
      revenueByService: [
        { name: "Assignments", value: Number(assignRevenue.total || 0) },
        { name: "Certifications", value: Number(certRevenue.total || 0) },
        { name: "Deliveries", value: Number(deliveryRevenue.total || 0) },
        { name: "Tasks", value: Number(taskRevenue.total || 0) },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function formatRows(rows: any[], dateKey: string, valueKey: string) {
  return (rows || []).map((r: any) => ({
    date: r[dateKey] instanceof Date ? r[dateKey].toISOString().slice(0, 10) : String(r[dateKey]),
    value: Number(r[valueKey] || 0),
  }));
}

function mergeOrdersByDay(assignRows: any[], deliveryRows: any[]) {
  const map: Record<string, number> = {};
  for (const r of assignRows) {
    const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date);
    map[d] = (map[d] || 0) + Number(r.count || 0);
  }
  for (const r of deliveryRows) {
    const d = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date);
    map[d] = (map[d] || 0) + Number(r.count || 0);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
}

// ─── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", adminMiddleware, async (req, res) => {
  try {
    const search = String(req.query.search || "");
    const role = String(req.query.role || "");
    const college = String(req.query.college || "");
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`)));
    if (role) conditions.push(eq(usersTable.role, role));
    if (college) conditions.push(ilike(usersTable.college, `%${college}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(usersTable).where(where);
    const users = await db.select({
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, college: usersTable.college, program: usersTable.program,
      year: usersTable.year, emailVerified: usersTable.emailVerified,
      followersCount: usersTable.followersCount, postsCount: usersTable.postsCount,
      banned: usersTable.banned, createdAt: usersTable.createdAt,
    }).from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(pageSize).offset(offset);

    return res.json({ users, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/users/:userId", adminMiddleware, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.params.userId));
    if (!user) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = user;

    const [postCount] = await db.select({ count: count() }).from(postsTable).where(eq(postsTable.authorId, user.id));
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id));
    const recentTx = await db.select().from(transactionsTable)
      .where(wallet ? eq(transactionsTable.walletId, wallet.id) : sql`FALSE`)
      .orderBy(desc(transactionsTable.createdAt)).limit(5);

    return res.json({ ...safeUser, stats: { posts: Number(postCount.count), walletBalance: wallet?.balance || "0" }, recentTransactions: recentTx });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/users/:userId", adminMiddleware, async (req, res) => {
  try {
    const { name, college, program, year, phone, role } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (college !== undefined) updates.college = college;
    if (program !== undefined) updates.program = program;
    if (year !== undefined) updates.year = Number(year);
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, req.params.userId)).returning();
    if (!updated) return res.status(404).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:userId", adminMiddleware, async (req, res) => {
  try {
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, req.params.userId)).returning();
    if (!deleted) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, message: "User deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/users/:userId/ban", adminMiddleware, async (req, res) => {
  try {
    const { banned } = req.body;
    const [updated] = await db.update(usersTable).set({ banned: Boolean(banned) }).where(eq(usersTable.id, req.params.userId)).returning();
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, message: banned ? "User banned" : "User unbanned" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/users/:userId/role", adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!["student", "provider", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });
    const [updated] = await db.update(usersTable).set({ role }).where(eq(usersTable.id, req.params.userId)).returning();
    if (!updated) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, message: "Role updated" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Services ──────────────────────────────────────────────────────────────────
function buildServiceQuery(table: any, nameField: string, req: any) {
  const search = String(req.query.search || "");
  const status = String(req.query.status || "");
  const conditions: any[] = [];
  if (search) conditions.push(ilike(table[nameField], `%${search}%`));
  if (status) conditions.push(eq(table.status, status));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

router.get("/services/assignments", adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;
    const where = buildServiceQuery(assignmentsTable, "title", req);
    const [{ total }] = await db.select({ total: count() }).from(assignmentsTable).where(where);
    const items = await db.select({
      id: assignmentsTable.id, title: assignmentsTable.title, status: assignmentsTable.status,
      price: assignmentsTable.price, posterId: assignmentsTable.posterId,
      posterName: usersTable.name, createdAt: assignmentsTable.createdAt,
    }).from(assignmentsTable)
      .leftJoin(usersTable, eq(assignmentsTable.posterId, usersTable.id))
      .where(where).orderBy(desc(assignmentsTable.createdAt)).limit(pageSize).offset(offset);
    return res.json({ items, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/services/assignments/:id", adminMiddleware, async (req, res) => {
  try {
    const { status, price } = req.body;
    const updates: any = {};
    if (status) updates.status = status;
    if (price) updates.price = String(price);
    const [updated] = await db.update(assignmentsTable).set(updates).where(eq(assignmentsTable.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/services/assignments/:id", adminMiddleware, async (req, res) => {
  try {
    await db.delete(assignmentsTable).where(eq(assignmentsTable.id, req.params.id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/services/certifications", adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;
    const where = buildServiceQuery(certificationsTable, "title", req);
    const [{ total }] = await db.select({ total: count() }).from(certificationsTable).where(where);
    const items = await db.select({
      id: certificationsTable.id, title: certificationsTable.title, status: certificationsTable.status,
      price: certificationsTable.price, posterId: certificationsTable.posterId,
      posterName: usersTable.name, createdAt: certificationsTable.createdAt,
    }).from(certificationsTable)
      .leftJoin(usersTable, eq(certificationsTable.posterId, usersTable.id))
      .where(where).orderBy(desc(certificationsTable.createdAt)).limit(pageSize).offset(offset);
    return res.json({ items, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/services/certifications/:id", adminMiddleware, async (req, res) => {
  try {
    await db.delete(certificationsTable).where(eq(certificationsTable.id, req.params.id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/services/tasks", adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;
    const where = buildServiceQuery(tasksTable, "title", req);
    const [{ total }] = await db.select({ total: count() }).from(tasksTable).where(where);
    const items = await db.select({
      id: tasksTable.id, title: tasksTable.title, status: tasksTable.status,
      price: tasksTable.budget, posterId: tasksTable.posterId,
      posterName: usersTable.name, createdAt: tasksTable.createdAt,
    }).from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.posterId, usersTable.id))
      .where(where).orderBy(desc(tasksTable.createdAt)).limit(pageSize).offset(offset);
    return res.json({ items, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/services/tasks/:id", adminMiddleware, async (req, res) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, req.params.id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/services/deliveries", adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;
    const search = String(req.query.search || "");
    const status = String(req.query.status || "");
    const conditions: any[] = [];
    if (search) conditions.push(or(ilike(deliveriesTable.pickupLocation, `%${search}%`), ilike(deliveriesTable.dropLocation, `%${search}%`)));
    if (status) conditions.push(eq(deliveriesTable.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const requesterAlias = db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).as("requester");
    const [{ total }] = await db.select({ total: count() }).from(deliveriesTable).where(where);
    const rows = await db.select({
      id: deliveriesTable.id, requesterId: deliveriesTable.requesterId,
      deliveryAgentId: deliveriesTable.deliveryAgentId,
      pickupType: deliveriesTable.pickupType, pickupLocation: deliveriesTable.pickupLocation,
      dropLocation: deliveriesTable.dropLocation, status: deliveriesTable.status,
      deliveryFee: deliveriesTable.deliveryFee, createdAt: deliveriesTable.createdAt,
      requesterName: usersTable.name,
    }).from(deliveriesTable)
      .leftJoin(usersTable, eq(deliveriesTable.requesterId, usersTable.id))
      .where(where).orderBy(desc(deliveriesTable.createdAt)).limit(pageSize).offset(offset);

    const items = rows.map(r => ({ ...r, agentName: null }));
    return res.json({ items, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/services/deliveries/:id", adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const [updated] = await db.update(deliveriesTable).set({ status }).where(eq(deliveriesTable.id, req.params.id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/services/deliveries/:id", adminMiddleware, async (req, res) => {
  try {
    await db.delete(deliveriesTable).where(eq(deliveriesTable.id, req.params.id));
    return res.json({ success: true, message: "Deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Transactions ──────────────────────────────────────────────────────────────
router.get("/transactions", adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;
    const type = String(req.query.type || "");
    const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;

    const conditions: any[] = [];
    if (type) conditions.push(eq(transactionsTable.type, type));
    if (startDate) conditions.push(gte(transactionsTable.createdAt, startDate));
    if (endDate) conditions.push(lte(transactionsTable.createdAt, endDate));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(transactionsTable).where(where);
    const [{ totalVolume }] = await db.select({ totalVolume: sum(transactionsTable.amount) }).from(transactionsTable).where(where);

    const items = await db.select({
      id: transactionsTable.id, walletId: transactionsTable.walletId,
      type: transactionsTable.type, amount: transactionsTable.amount,
      description: transactionsTable.description, status: transactionsTable.status,
      createdAt: transactionsTable.createdAt,
      userId: usersTable.id, userName: usersTable.name,
    }).from(transactionsTable)
      .leftJoin(walletsTable, eq(transactionsTable.walletId, walletsTable.id))
      .leftJoin(usersTable, eq(walletsTable.userId, usersTable.id))
      .where(where).orderBy(desc(transactionsTable.createdAt)).limit(pageSize).offset(offset);

    return res.json({ items, total: Number(total), page, pageSize, totalVolume: Number(totalVolume || 0) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Posts ─────────────────────────────────────────────────────────────────────
router.get("/posts", adminMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    const offset = (page - 1) * pageSize;
    const search = String(req.query.search || "");
    const where = search ? ilike(postsTable.content, `%${search}%`) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(postsTable).where(where);
    const posts = await db.select({
      id: postsTable.id, content: postsTable.content, authorId: postsTable.authorId,
      authorName: usersTable.name, likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount, createdAt: postsTable.createdAt,
    }).from(postsTable)
      .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(where).orderBy(desc(postsTable.createdAt)).limit(pageSize).offset(offset);

    return res.json({ posts, total: Number(total), page, pageSize });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/posts/:postId", adminMiddleware, async (req, res) => {
  try {
    await db.delete(commentsTable).where(eq(commentsTable.postId, req.params.postId));
    await db.delete(postsTable).where(eq(postsTable.id, req.params.postId));
    return res.json({ success: true, message: "Post deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Notifications Broadcast ───────────────────────────────────────────────────
router.post("/notifications/broadcast", adminMiddleware, async (req, res) => {
  try {
    const { title, body, targetRole } = req.body;
    if (!title || !body) return res.status(400).json({ error: "Title and body required" });

    const userQuery = db.select({ id: usersTable.id }).from(usersTable);
    const targets = targetRole && targetRole !== "all"
      ? await userQuery.where(eq(usersTable.role, targetRole))
      : await userQuery;

    const notifs = targets.map(u => ({
      id: nanoid(),
      userId: u.id,
      type: "service" as const,
      title,
      body,
      isRead: false,
      data: JSON.stringify({ broadcast: true }),
    }));

    if (notifs.length > 0) {
      for (const n of notifs) {
        await db.insert(notificationsTable).values(n).onConflictDoNothing();
      }
    }

    return res.json({ success: true, message: `Notification sent to ${notifs.length} users` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
