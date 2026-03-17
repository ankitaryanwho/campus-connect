import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey(),
  participant1Id: text("participant1_id").notNull().references(() => usersTable.id),
  participant2Id: text("participant2_id").notNull().references(() => usersTable.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;

export const messagesTable = pgTable("messages", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  senderId: text("sender_id").notNull().references(() => usersTable.id),
  conversationId: text("conversation_id"),
  chatroomId: text("chatroom_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ createdAt: true, isRead: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;

export const chatroomsTable = pgTable("chatrooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  memberCount: integer("member_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatroomSchema = createInsertSchema(chatroomsTable).omit({ createdAt: true, updatedAt: true });
export type InsertChatroom = z.infer<typeof insertChatroomSchema>;
export type Chatroom = typeof chatroomsTable.$inferSelect;
