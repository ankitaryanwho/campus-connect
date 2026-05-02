import { pgTable, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  college: text("college"),
  program: text("program"),
  year: integer("year"),
  phone: text("phone"),
  role: text("role").notNull().default("student"),
  services: text("services"),
  emailVerified: boolean("email_verified").notNull().default(false),
  banned: boolean("banned").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  verificationBadge: text("verification_badge"),
  gender: text("gender"),
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  postsCount: integer("posts_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const followsTable = pgTable("follows", {
  followerId: text("follower_id").notNull().references(() => usersTable.id),
  followingId: text("following_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("follows_follower_id_idx").on(t.followerId),
  index("follows_following_id_idx").on(t.followingId),
  index("follows_follower_following_idx").on(t.followerId, t.followingId),
]);

export const otpCodesTable = pgTable("otp_codes", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
