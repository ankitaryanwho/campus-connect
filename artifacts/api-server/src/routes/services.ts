import { Router } from "express";
import { db } from "@workspace/db";
import {
  assignmentsTable, coachingSessionsTable, deliveriesTable, tasksTable,
  taskApplicationsTable, usersTable, walletsTable, transactionsTable
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

async function safeUser(userId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users.length) return null;
  const { passwordHash: _, ...u } = users[0];
  return u;
}

// Assignments
router.get("/assignments", authMiddleware, async (req, res) => {
  try {
    const assignments = await db.select().from(assignmentsTable).orderBy(desc(assignmentsTable.createdAt));
    const formatted = await Promise.all(assignments.map(async a => ({
      ...a,
      poster: await safeUser(a.posterId),
      acceptedBy: a.acceptedById ? await safeUser(a.acceptedById) : null,
    })));
    res.json({ assignments: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get assignments" });
  }
});

router.post("/assignments", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { title, description, price, deliveryMode, subject, deadline } = req.body;
    if (!title || !description || !price || !deliveryMode) {
      res.status(400).json({ error: "ValidationError", message: "Required fields missing" });
      return;
    }
    const id = generateId();
    await db.insert(assignmentsTable).values({
      id, title, description, price: price.toString(), deliveryMode,
      posterId: userId, subject, deadline: deadline ? new Date(deadline) : null,
    });
    const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id)).limit(1);
    const formatted = { ...assignments[0], poster: await safeUser(userId), acceptedBy: null };
    res.status(201).json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create assignment" });
  }
});

router.post("/assignments/:assignmentId/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { assignmentId } = req.params;
    await db.update(assignmentsTable).set({ acceptedById: userId, status: "accepted" }).where(eq(assignmentsTable.id, assignmentId));
    const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, assignmentId)).limit(1);
    const formatted = { ...assignments[0], poster: await safeUser(assignments[0].posterId), acceptedBy: await safeUser(userId) };
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to accept assignment" });
  }
});

// Coaching Sessions
router.get("/coaching", authMiddleware, async (req, res) => {
  try {
    const sessions = await db.select().from(coachingSessionsTable).orderBy(desc(coachingSessionsTable.createdAt));
    const formatted = await Promise.all(sessions.map(async s => ({
      ...s,
      mentor: await safeUser(s.mentorId),
      bookedBy: s.bookedById ? await safeUser(s.bookedById) : null,
    })));
    res.json({ sessions: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get coaching sessions" });
  }
});

router.post("/coaching", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { title, description, price, sessionType, subject, scheduledAt, maxStudents } = req.body;
    const id = generateId();
    await db.insert(coachingSessionsTable).values({
      id, title, description, price: price.toString(), sessionType: sessionType || "one_on_one",
      subject, mentorId: userId, scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      maxStudents: maxStudents || 1,
    });
    const sessions = await db.select().from(coachingSessionsTable).where(eq(coachingSessionsTable.id, id)).limit(1);
    res.status(201).json({ ...sessions[0], mentor: await safeUser(userId), bookedBy: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create coaching session" });
  }
});

router.post("/coaching/:sessionId/book", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { sessionId } = req.params;
    await db.update(coachingSessionsTable).set({ bookedById: userId, status: "booked" }).where(eq(coachingSessionsTable.id, sessionId));
    const sessions = await db.select().from(coachingSessionsTable).where(eq(coachingSessionsTable.id, sessionId)).limit(1);
    res.json({ ...sessions[0], mentor: await safeUser(sessions[0].mentorId), bookedBy: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to book session" });
  }
});

// Deliveries
router.get("/deliveries", authMiddleware, async (req, res) => {
  try {
    const deliveries = await db.select().from(deliveriesTable).orderBy(desc(deliveriesTable.createdAt));
    const formatted = await Promise.all(deliveries.map(async d => ({
      ...d,
      requester: await safeUser(d.requesterId),
      deliveryAgent: d.deliveryAgentId ? await safeUser(d.deliveryAgentId) : null,
    })));
    res.json({ deliveries: formatted });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to get deliveries" });
  }
});

router.post("/deliveries", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { pickupLocation, dropLocation, item, notes } = req.body;
    const id = generateId();
    await db.insert(deliveriesTable).values({ id, pickupLocation, dropLocation, item, requesterId: userId, notes });
    const deliveries = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, id)).limit(1);
    res.status(201).json({ ...deliveries[0], requester: await safeUser(userId), deliveryAgent: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to create delivery" });
  }
});

router.post("/deliveries/:deliveryId/accept", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { deliveryId } = req.params;
    await db.update(deliveriesTable).set({ deliveryAgentId: userId, status: "accepted" }).where(eq(deliveriesTable.id, deliveryId));
    const deliveries = await db.select().from(deliveriesTable).where(eq(deliveriesTable.id, deliveryId)).limit(1);
    res.json({ ...deliveries[0], requester: await safeUser(deliveries[0].requesterId), deliveryAgent: await safeUser(userId) });
  } catch (err) {
    res.status(500).json({ error: "ServerError", message: "Failed to accept delivery" });
  }
});

// Tasks
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
    await db.insert(taskApplicationsTable).values({ id: generateId(), taskId, applicantId: userId });
    await db.update(tasksTable).set({ applicantsCount: sql`${tasksTable.applicantsCount} + 1` }).where(eq(tasksTable.id, taskId));
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId)).limit(1);
    res.json({ ...tasks[0], poster: await safeUser(tasks[0].posterId), assignedTo: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError", message: "Failed to apply for task" });
  }
});

export default router;
