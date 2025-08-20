import { pgTable, foreignKey, serial, integer, text, timestamp, boolean, index, unique, varchar, jsonb, doublePrecision } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const reportLogs = pgTable("report_logs", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	reportData: text("report_data").notNull(),
	status: text().notNull(),
	emailsSent: integer("emails_sent").default(0),
	errorMessage: text("error_message"),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [reportTemplates.id],
			name: "report_logs_template_id_report_templates_id_fk"
		}),
]);

export const emailNotifications = pgTable("email_notifications", {
	id: serial().primaryKey().notNull(),
	type: text().notNull(),
	recipient: text().notNull(),
	subject: text().notNull(),
	content: text().notNull(),
	status: text().default('pending').notNull(),
	reportLogId: integer("report_log_id"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reportLogId],
			foreignColumns: [reportLogs.id],
			name: "email_notifications_report_log_id_report_logs_id_fk"
		}),
]);

export const reportTemplates = pgTable("report_templates", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	reportType: text("report_type").notNull(),
	schedule: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	emailRecipients: text("email_recipients").array(),
	lastRun: timestamp("last_run", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	category: text().notNull(),
	contactPerson: text("contact_person"),
	phone: text(),
	email: text(),
	address: text(),
	city: text(),
	country: text().default('Россия'),
	website: text(),
	telegram: text(),
	whatsapp: text(),
	specialization: text(),
	brands: text().array(),
	minOrder: text("min_order"),
	paymentTerms: text("payment_terms"),
	deliveryTime: text("delivery_time"),
	notes: text(),
	rating: text().default('⭐⭐⭐'),
	status: text().default('active'),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const chatSessions = pgTable("chat_sessions", {
	id: text().default(nextval(\'chat_sessions_id_seq\'::regclass)).primaryKey().notNull(),
	userId: integer("user_id").default(1),
	title: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_messages", {
	id: serial().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	content: text().notNull(),
	sender: text().notNull(),
	provider: text(),
	model: text(),
	category: text(),
	confidence: text(),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [chatSessions.id],
			name: "ai_messages_session_id_chat_sessions_id_fk"
		}),
]);

export const semanticCache = pgTable("semantic_cache", {
	id: serial().primaryKey().notNull(),
	queryHash: text("query_hash").notNull(),
	queryText: text("query_text").notNull(),
	semanticResult: text("semantic_result").notNull(),
	confidence: integer().default(50),
	category: text(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("semantic_cache_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("semantic_cache_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	unique("semantic_cache_query_hash_unique").on(table.queryHash),
]);

export const projectMemory = pgTable("project_memory", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sessionId: text("session_id").notNull(),
	projectTitle: text("project_title").notNull(),
	projectType: text("project_type").notNull(),
	description: text(),
	domain: text().default('general'),
	semanticTags: text("semantic_tags").array(),
	concepts: text().array(),
	originalQuery: text("original_query"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("project_memory_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("project_memory_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("project_memory_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const emotionalHistory = pgTable("emotional_history", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	sessionId: text("session_id").notNull(),
	emotionalState: text("emotional_state").notNull(),
	dominantEmotion: text("dominant_emotion"),
	confidence: integer().default(50),
	context: text(),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("emotional_history_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("emotional_history_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const semanticDocuments = pgTable("semantic_documents", {
	id: serial().primaryKey().notNull(),
	content: text().notNull(),
	title: varchar({ length: 255 }),
	category: varchar({ length: 100 }),
	metadata: jsonb(),
	embeddingText: text("embedding_text"),
	contentHash: varchar("content_hash", { length: 64 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("semantic_documents_content_idx").using("gin", sql`to_tsvector('russian'::regconfig`),
	unique("semantic_documents_content_hash_key").on(table.contentHash),
]);

export const searchQueries = pgTable("search_queries", {
	id: serial().primaryKey().notNull(),
	query: text().notNull(),
	queryNormalized: text("query_normalized"),
	resultsCount: integer("results_count"),
	executionTime: doublePrecision("execution_time"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const learningPatterns = pgTable("learning_patterns", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	pattern: text().notNull(),
	category: text().notNull(),
	confidence: integer().default(50),
	successRate: integer("success_rate").default(0),
	timesUsed: integer("times_used").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("learning_patterns_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("learning_patterns_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const userProfiles = pgTable("user_profiles", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	favoriteColors: text("favorite_colors").array(),
	preferredStyles: text("preferred_styles").array(),
	designComplexity: text("design_complexity").default('medium'),
	totalInteractions: integer("total_interactions").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_profiles_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	displayName: text("display_name").notNull(),
	role: text().notNull(),
	avatar: text(),
	isOnline: boolean("is_online").default(false),
	lastSeen: timestamp("last_seen", { mode: 'string' }),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const messages = pgTable("messages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	content: text().notNull(),
	userId: varchar("user_id"),
	isAi: boolean("is_ai").default(false),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	isTyping: boolean("is_typing").default(false),
	chatType: text("chat_type").default('general'),
	privateChatUserId: varchar("private_chat_user_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.privateChatUserId],
			foreignColumns: [users.id],
			name: "messages_private_chat_user_id_users_id_fk"
		}),
]);

export const chatUsers = pgTable("chat_users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	displayName: text("display_name").notNull(),
	role: text().notNull(),
	avatar: text(),
	isOnline: boolean("is_online").default(false),
	lastSeen: timestamp("last_seen", { mode: 'string' }),
}, (table) => [
	unique("chat_users_username_key").on(table.username),
]);

export const chatMessages = pgTable("chat_messages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	content: text().notNull(),
	userId: varchar("user_id"),
	isAi: boolean("is_ai").default(false),
	timestamp: timestamp({ mode: 'string' }).defaultNow(),
	isTyping: boolean("is_typing").default(false),
	chatType: text("chat_type").default('general'),
	privateChatUserId: varchar("private_chat_user_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [chatUsers.id],
			name: "chat_messages_user_id_fkey"
		}),
	foreignKey({
			columns: [table.privateChatUserId],
			foreignColumns: [chatUsers.id],
			name: "chat_messages_private_chat_user_id_fkey"
		}),
]);
