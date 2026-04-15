import { pgTable, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Assignments ─────────────────────────────────────────────────────────────
export const assignmentsTable = pgTable("assignments", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  subject: text("subject").notNull(),
  program: text("program").notNull(),
  targetYear: integer("target_year").notNull(),
  status: text("status").notNull().default("open"),
  posterId: text("poster_id").notNull().references(() => usersTable.id),
  bookedById: text("booked_by_id").references(() => usersTable.id),
  deadline: timestamp("deadline"),
  statusHistory: text("status_history"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ createdAt: true, status: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;

// ─── Certifications ──────────────────────────────────────────────────────────
export const certificationsTable = pgTable("certifications", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  subject: text("subject").notNull(),
  program: text("program").notNull(),
  targetYear: integer("target_year").notNull(),
  status: text("status").notNull().default("open"),
  posterId: text("poster_id").notNull().references(() => usersTable.id),
  bookedById: text("booked_by_id").references(() => usersTable.id),
  deadline: timestamp("deadline"),
  statusHistory: text("status_history"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCertificationSchema = createInsertSchema(certificationsTable).omit({ createdAt: true, status: true });
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type Certification = typeof certificationsTable.$inferSelect;

// ─── Deliveries ───────────────────────────────────────────────────────────────
// Pickup types: "gate" (parcel pickup from Gate 1/3) or "outlet" (food order from campus restaurants)
// Status flow: pending → accepted → payment_marked → payment_confirmed → in_progress → completed | cancelled
export const deliveriesTable = pgTable("deliveries", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => usersTable.id),
  deliveryAgentId: text("delivery_agent_id").references(() => usersTable.id),

  pickupType: text("pickup_type").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  dropLocation: text("drop_location").notNull(),

  // Gate-specific
  websiteName: text("website_name"),
  courierCompany: text("courier_company"),
  orderCustomerName: text("order_customer_name"),
  orderId: text("order_id_ref"),
  orderMobile: text("order_mobile"),

  // Outlet-specific
  foodItems: text("food_items"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("30"),

  status: text("status").notNull().default("pending"),
  statusHistory: text("status_history"),

  paymentTimerStartedAt: timestamp("payment_timer_started_at"),
  paymentMarkedAt: timestamp("payment_marked_at"),

  // Verification images (base64 stored)
  selfieUrl: text("selfie_url"),
  selfieTimestamp: timestamp("selfie_timestamp"),
  locationPhotoUrl: text("location_photo_url"),
  locationPhotoTimestamp: timestamp("location_photo_timestamp"),
  qrImageUrl: text("qr_image_url"),
  paymentScreenshotUrl: text("payment_screenshot_url"),

  // Delivery charge payment status
  chargeStatus: text("charge_status").default("pending"), // pending | paid

  cancelledAt: timestamp("cancelled_at"),

  // Legacy fields preserved from original production schema
  item: text("item"),
  fee: numeric("fee", { precision: 10, scale: 2 }).default("20"),
  notes: text("notes"),

  // Rating by student after completion
  ratingHappiness: integer("rating_happiness"),
  ratingHandling: integer("rating_handling"),
  ratingOnTime: integer("rating_on_time"),
  ratingComment: text("rating_comment"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ createdAt: true, status: true });
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;

// ─── Outlet Items (admin-managed menus) ──────────────────────────────────────
export const outletItemsTable = pgTable("outlet_items", {
  id: text("id").primaryKey(),
  outletName: text("outlet_name").notNull(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  available: boolean("available").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OutletItem = typeof outletItemsTable.$inferSelect;

// ─── Tasks ────────────────────────────────────────────────────────────────────
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

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projectsTable = pgTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  subject: text("subject").notNull(),
  program: text("program").notNull(),
  targetYear: integer("target_year").notNull(),
  status: text("status").notNull().default("open"),
  posterId: text("poster_id").notNull().references(() => usersTable.id),
  bookedById: text("booked_by_id").references(() => usersTable.id),
  deadline: timestamp("deadline"),
  statusHistory: text("status_history"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ createdAt: true, status: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

// ─── Service Bookings (multi-booking for assignments / certifications / projects) ─
// Each booking is an independent record; the listing stays "open" forever
export const serviceBookingsTable = pgTable("service_bookings", {
  id: text("id").primaryKey(),
  serviceType: text("service_type").notNull(), // "assignments" | "certifications" | "projects"
  listingId: text("listing_id").notNull(),
  studentId: text("student_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("booked"), // booked | accepted | in_progress | completed | delivered | rejected
  statusHistory: text("status_history"),

  // Escrow / payment fields
  price: numeric("price", { precision: 10, scale: 2 }),           // listing price at booking time
  gstAmount: numeric("gst_amount", { precision: 10, scale: 2 }),  // 18% GST
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 }),  // price + gst = amount deducted from student
  escrowStatus: text("escrow_status").default("held"),             // held | released | refunded

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ServiceBooking = typeof serviceBookingsTable.$inferSelect;

// Keep for backward compat — not used in new UI
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
