CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"user_id" varchar,
	"is_ai" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now(),
	"is_typing" boolean DEFAULT false,
	"chat_type" text DEFAULT 'general',
	"private_chat_user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"avatar" text,
	"is_online" boolean DEFAULT false,
	"last_seen" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_private_chat_user_id_users_id_fk" FOREIGN KEY ("private_chat_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;