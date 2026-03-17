import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const assignmentsTable = pgTable("assignments", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  deliveryMode: text("delivery_mode").notNull().default("pdf"),
  status: text("status").notNull().default("open"),
  posterId: text("poster_id").notNull().references(() => usersTable.id),
  acceptedById: text("accepted_by_id").references(() => usersTable.id),
  subject: text("subject"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ createdAt: true, status: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;

export const coachingSessionsTable = pgTable("coaching_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  sessionType: text("session_type").notNull().default("one_on_one"),
  subject: text("subject").notNull(),
  mentorId: text("mentor_id").notNull().references(() => usersTable.id),
  bookedById: text("booked_by_id").references(() => usersTable.id),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").notNull().default("available"),
  maxStudents: integer("max_students").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCoachingSessionSchema = createInsertSchema(coachingSessionsTable).omit({ createdAt: true, status: true });
export type InsertCoachingSession = z.infer<typeof insertCoachingSessionSchema>;
export type CoachingSession = typeof coachingSessionsTable.$inferSelect;

export const deliveriesTable = pgTable("deliveries", {
  id: text("id").primaryKey(),
  pickupLocation: text("pickup_location").notNull(),
  dropLocation: text("drop_location").notNull(),
  item: text("item").notNull(),
  status: text("status").notNull().default("pending"),
  requesterId: text("requester_id").notNull().references(() => usersTable.id),
  deliveryAgentId: text("delivery_agent_id").references(() => usersTable.id),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull().default("20"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ createdAt: true, status: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget: numeric("budget", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("open"),
  posterId: text("poster_id").notNull().references(() => usersTable.id),
  assignedToId: text("assigned_to_id").references(() => usersTable.id),
  applicantsCount: integer("applicants_count").notNull().default(0),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ createdAt: true, status: true, applicantsCount: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

export const taskApplicationsTable = pgTable("task_applications", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasksTable.id),
  applicantId: text("applicant_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
