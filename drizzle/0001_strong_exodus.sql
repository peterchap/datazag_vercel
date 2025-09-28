ALTER TABLE "credit_transactions" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "credits_purchased" integer DEFAULT 0;