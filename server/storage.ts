import { type User, type InsertUser, type Message, type InsertMessage, type MessageWithUser, users, messages } from "@shared/schema";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(limit?: number, chatType?: string, userId?: string): Promise<MessageWithUser[]>;
  updateMessage(id: string, updates: Partial<InsertMessage>): Promise<void>;
  updateMessageTyping(userId: string, isTyping: boolean): Promise<void>;
  deleteTypingMessages(): Promise<void>;
  clearAll(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.messages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      lastSeen: new Date(),
      avatar: insertUser.avatar || null,
      isOnline: insertUser.isOnline || false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      userId: insertMessage.userId || null,
      isAI: insertMessage.isAI || false,
      isTyping: insertMessage.isTyping || false,
      chatType: insertMessage.chatType || "general",
      privateChatUserId: insertMessage.privateChatUserId || null,
      attachments: insertMessage.attachments || null,
      attachmentTypes: insertMessage.attachmentTypes || null,
      attachmentNames: insertMessage.attachmentNames || null,
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessages(limit: number = 50, chatType: string = "general", userId?: string): Promise<MessageWithUser[]> {
    let messages = Array.from(this.messages.values())
      .filter(msg => !msg.isTyping)
      .filter(msg => {
        if (chatType === "private") {
          return msg.chatType === "private" && msg.privateChatUserId === userId;
        }
        return msg.chatType === "general" || msg.chatType === null;
      })
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0))
      .slice(-limit);

    return messages.map(message => ({
      ...message,
      user: message.userId ? this.users.get(message.userId) : undefined,
    }));
  }

  async updateMessage(id: string, updates: Partial<InsertMessage>): Promise<void> {
    const message = this.messages.get(id);
    if (message) {
      const updatedMessage = { ...message, ...updates };
      this.messages.set(id, updatedMessage);
    }
  }

  async updateMessageTyping(userId: string, isTyping: boolean): Promise<void> {
    // Remove existing typing messages for this user
    const messagesToDelete: string[] = [];
    this.messages.forEach((message, id) => {
      if (message.userId === userId && message.isTyping) {
        messagesToDelete.push(id);
      }
    });
    messagesToDelete.forEach(id => this.messages.delete(id));

    // Add new typing message if typing
    if (isTyping) {
      const id = randomUUID();
      const message: Message = {
        id,
        content: "",
        userId,
        isAI: false,
        timestamp: new Date(),
        isTyping: true,
        chatType: "general",
        privateChatUserId: null,
        attachments: null,
        attachmentTypes: null,
        attachmentNames: null,
      };
      this.messages.set(id, message);
    }
  }

  async deleteTypingMessages(): Promise<void> {
    const messagesToDelete: string[] = [];
    this.messages.forEach((message, id) => {
      if (message.isTyping) {
        messagesToDelete.push(id);
      }
    });
    messagesToDelete.forEach(id => this.messages.delete(id));
  }

  // Helper method to clear all data
  async clearAll(): Promise<void> {
    this.users.clear();
    this.messages.clear();
  }
}

// PostgreSQL Storage Implementation
export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await this.db.update(users)
      .set({ isOnline, lastSeen: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values(insertMessage).returning();
    return result[0];
  }

  async getMessages(limit: number = 50, chatType: string = "general", userId?: string): Promise<MessageWithUser[]> {
    let baseQuery = this.db
      .select({
        id: messages.id,
        content: messages.content,
        userId: messages.userId,
        isAI: messages.isAI,
        timestamp: messages.timestamp,
        isTyping: messages.isTyping,
        chatType: messages.chatType,
        privateChatUserId: messages.privateChatUserId,
        attachments: messages.attachments,
        attachmentTypes: messages.attachmentTypes,
        attachmentNames: messages.attachmentNames,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          role: users.role,
          avatar: users.avatar,
          isOnline: users.isOnline,
          lastSeen: users.lastSeen,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id));

    let conditions = [eq(messages.isTyping, false)];

    if (chatType === "private" && userId) {
      conditions.push(eq(messages.chatType, "private"));
      conditions.push(eq(messages.privateChatUserId, userId));
    } else {
      conditions.push(eq(messages.chatType, "general"));
    }

    const result = await baseQuery
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    return result.reverse().map(row => ({
      id: row.id,
      content: row.content,
      userId: row.userId,
      isAI: row.isAI,
      timestamp: row.timestamp,
      isTyping: row.isTyping,
      chatType: row.chatType,
      privateChatUserId: row.privateChatUserId,
      attachments: row.attachments,
      attachmentTypes: row.attachmentTypes,
      attachmentNames: row.attachmentNames,
      user: row.user?.id ? row.user as User : undefined
    }));
  }

  async updateMessage(id: string, updates: Partial<InsertMessage>): Promise<void> {
    await this.db.update(messages)
      .set(updates)
      .where(eq(messages.id, id));
  }

  async updateMessageTyping(userId: string, isTyping: boolean): Promise<void> {
    // Remove existing typing messages for this user
    await this.db.delete(messages).where(and(
      eq(messages.userId, userId),
      eq(messages.isTyping, true)
    ));

    // Add new typing message if typing
    if (isTyping) {
      await this.db.insert(messages).values({
        content: "",
        userId,
        isAI: false,
        isTyping: true,
        chatType: "general",
        privateChatUserId: null,
      });
    }
  }

  async deleteTypingMessages(): Promise<void> {
    await this.db.delete(messages).where(eq(messages.isTyping, true));
  }

  async clearAll(): Promise<void> {
    await this.db.delete(messages);
    await this.db.delete(users);
  }
}

// Use PostgreSQL storage in production or if DATABASE_URL is available
export const storage = process.env.DATABASE_URL 
  ? new PostgresStorage() 
  : new MemStorage();
