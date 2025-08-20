import { relations } from "drizzle-orm/relations";
import { reportTemplates, reportLogs, emailNotifications, chatSessions, aiMessages, users, messages, chatUsers, chatMessages } from "./schema";

export const reportLogsRelations = relations(reportLogs, ({one, many}) => ({
	reportTemplate: one(reportTemplates, {
		fields: [reportLogs.templateId],
		references: [reportTemplates.id]
	}),
	emailNotifications: many(emailNotifications),
}));

export const reportTemplatesRelations = relations(reportTemplates, ({many}) => ({
	reportLogs: many(reportLogs),
}));

export const emailNotificationsRelations = relations(emailNotifications, ({one}) => ({
	reportLog: one(reportLogs, {
		fields: [emailNotifications.reportLogId],
		references: [reportLogs.id]
	}),
}));

export const aiMessagesRelations = relations(aiMessages, ({one}) => ({
	chatSession: one(chatSessions, {
		fields: [aiMessages.sessionId],
		references: [chatSessions.id]
	}),
}));

export const chatSessionsRelations = relations(chatSessions, ({many}) => ({
	aiMessages: many(aiMessages),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	user_userId: one(users, {
		fields: [messages.userId],
		references: [users.id],
		relationName: "messages_userId_users_id"
	}),
	user_privateChatUserId: one(users, {
		fields: [messages.privateChatUserId],
		references: [users.id],
		relationName: "messages_privateChatUserId_users_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	messages_userId: many(messages, {
		relationName: "messages_userId_users_id"
	}),
	messages_privateChatUserId: many(messages, {
		relationName: "messages_privateChatUserId_users_id"
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatUser_userId: one(chatUsers, {
		fields: [chatMessages.userId],
		references: [chatUsers.id],
		relationName: "chatMessages_userId_chatUsers_id"
	}),
	chatUser_privateChatUserId: one(chatUsers, {
		fields: [chatMessages.privateChatUserId],
		references: [chatUsers.id],
		relationName: "chatMessages_privateChatUserId_chatUsers_id"
	}),
}));

export const chatUsersRelations = relations(chatUsers, ({many}) => ({
	chatMessages_userId: many(chatMessages, {
		relationName: "chatMessages_userId_chatUsers_id"
	}),
	chatMessages_privateChatUserId: many(chatMessages, {
		relationName: "chatMessages_privateChatUserId_chatUsers_id"
	}),
}));