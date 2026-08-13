CREATE TYPE "public"."ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "refund_policies" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"tier" "customer_tier" NOT NULL,
	"refund_percentage" integer NOT NULL,
	"max_auto_refund" integer NOT NULL,
	CONSTRAINT "refund_policies_percentage_range" CHECK ("refund_policies"."refund_percentage" >= 0 and "refund_policies"."refund_percentage" <= 100),
	CONSTRAINT "refund_policies_max_auto_refund_nonnegative" CHECK ("refund_policies"."max_auto_refund" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"order_id" varchar(32) NOT NULL,
	"customer_id" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"status" "ticket_status" NOT NULL,
	"notes" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "refund_policies_tier_unique" ON "refund_policies" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "tickets_order_id_idx" ON "tickets" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "tickets_customer_id_idx" ON "tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");