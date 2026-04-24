import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls").notNull().default("[]"),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  category: text("category").notNull().default("social"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  hidden: boolean("hidden").notNull().default(false),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ createdAt: true, likesCount: true, commentsCount: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;

export const likesTable = pgTable("likes", {
  userId: text("user_id").notNull().references(() => usersTable.id),
  postId: text("post_id").notNull().references(() => postsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  postId: text("post_id").notNull().references(() => postsTable.id),
  parentId: text("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
