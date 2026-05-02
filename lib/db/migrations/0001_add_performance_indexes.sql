CREATE INDEX IF NOT EXISTS "follows_follower_id_idx" ON "follows" USING btree ("follower_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "follows_following_id_idx" ON "follows" USING btree ("following_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "follows_follower_following_idx" ON "follows" USING btree ("follower_id","following_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_post_id_idx" ON "comments" USING btree ("post_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "likes_post_id_user_id_idx" ON "likes" USING btree ("post_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts" USING btree ("created_at" desc);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_author_id_idx" ON "posts" USING btree ("author_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_author_created_at_idx" ON "posts" USING btree ("author_id","created_at" desc);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at" desc);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_chatroom_id_created_at_idx" ON "messages" USING btree ("chatroom_id","created_at" desc);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages" USING btree ("sender_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_messages_order_id_created_at_idx" ON "order_messages" USING btree ("order_id","created_at" desc);
