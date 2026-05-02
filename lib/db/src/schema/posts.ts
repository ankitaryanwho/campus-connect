import { pgTable, text, integer, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";
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
}, (t) => [
  index("posts_created_at_idx").on(desc(t.createdAt)),
  index("posts_author_id_idx").on(t.authorId),
  index("posts_author_created_at_idx").on(t.authorId, desc(t.createdAt)),
]);

export const insertPostSchema = createInsertSchema(postsTable).omit({ createdAt: true, likesCount: true, commentsCount: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;

export const likesTable = pgTable("likes", {
  userId: text("user_id").notNull().references(() => usersTable.id),
  postId: text("post_id").notNull().references(() => postsTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("likes_post_id_user_id_idx").on(t.postId, t.userId),
]);

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => usersTable.id),
  postId: text("post_id").notNull().references(() => postsTable.id),
  parentId: text("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("comments_post_id_idx").on(t.postId),
]);

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
