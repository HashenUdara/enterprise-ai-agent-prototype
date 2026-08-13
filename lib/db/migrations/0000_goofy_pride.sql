CREATE TYPE "public"."customer_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('GOLD', 'SILVER', 'STANDARD');--> statement-breakpoint
CREATE TYPE "public"."mcp_log_status" AS ENUM('SUCCESS', 'FAILURE');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('PENDING', 'IN_TRANSIT', 'DELAYED', 'DELIVERED');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" "customer_tier" NOT NULL,
	"email" text NOT NULL,
	"status" "customer_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tool" text NOT NULL,
	"target" text,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"status" "mcp_log_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"customer_id" varchar(32) NOT NULL,
	"total" integer NOT NULL,
	"status" "order_status" NOT NULL,
	"shipment_id" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_nonnegative" CHECK ("orders"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"order_id" varchar(32) NOT NULL,
	"carrier" text NOT NULL,
	"tracking_number" text NOT NULL,
	"status" "shipment_status" NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shipments_delay_days_nonnegative" CHECK ("shipments"."delay_days" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_tier_idx" ON "customers" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "mcp_logs_created_at_idx" ON "mcp_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mcp_logs_tool_idx" ON "mcp_logs" USING btree ("tool");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_shipment_id_unique" ON "orders" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_order_id_unique" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_tracking_number_unique" ON "shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "shipments_status_idx" ON "shipments" USING btree ("status");