import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("chat_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  avatar: text("avatar"),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
});

export const messages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  userId: varchar("user_id").references(() => users.id),
  isAI: boolean("is_ai").default(false),
  timestamp: timestamp("timestamp").defaultNow(),
  isTyping: boolean("is_typing").default(false),
  chatType: text("chat_type").default("general"), // "general" or "private"
  privateChatUserId: varchar("private_chat_user_id").references(() => users.id), // For private AI chats
  attachments: text("attachments").array(), // Array of file URLs/paths
  attachmentTypes: text("attachment_types").array(), // Array of file types (image, video, audio, document)
  attachmentNames: text("attachment_names").array(), // Array of original file names
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastSeen: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
}).extend({
  attachments: z.array(z.string()).optional(),
  attachmentTypes: z.array(z.string()).optional(),
  attachmentNames: z.array(z.string()).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type MessageWithUser = Message & {
  user?: User;
};
