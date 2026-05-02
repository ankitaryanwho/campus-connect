import { pgTable, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const conversationsTable = pgTable("conversations", {
  id: text("id").primaryKey(),
  participant1Id: text("participant1_id").notNull().references(() => usersTable.id),
  participant2Id: text("participant2_id").notNull().references(() => usersTable.id),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  anonymousPostId: text("anonymous_post_id"),
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
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("messages_conversation_id_created_at_idx").on(t.conversationId, desc(t.createdAt)),
  index("messages_chatroom_id_created_at_idx").on(t.chatroomId, desc(t.createdAt)),
  index("messages_sender_id_idx").on(t.senderId),
]);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ createdAt: true, isRead: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;

export const orderMessagesTable = pgTable("order_messages", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  orderType: text("order_type").notNull(),
  senderId: text("sender_id").notNull().references(() => usersTable.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("order_messages_order_id_created_at_idx").on(t.orderId, desc(t.createdAt)),
]);

export type OrderMessage = typeof orderMessagesTable.$inferSelect;

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
