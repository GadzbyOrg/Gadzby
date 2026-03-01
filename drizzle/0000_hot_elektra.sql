CREATE TYPE "public"."event_participant_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('SHARED_COST', 'COMMERCIAL');--> statement-breakpoint
CREATE TYPE "public"."inventory_audit_status" AS ENUM('OPEN', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."mandat_status" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('PURCHASE', 'TOPUP', 'TRANSFER', 'REFUND', 'DEPOSIT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."wallet_source" AS ENUM('PERSONAL', 'FAMILY');--> statement-breakpoint
CREATE TYPE "public"."tbk" AS ENUM('ME', 'CL', 'CH', 'KA', 'PA', 'BO', 'LI', 'AN');--> statement-breakpoint
CREATE TABLE "event_participants" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "event_participant_status" DEFAULT 'APPROVED' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "event_participants_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "event_revenues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "event_type" DEFAULT 'COMMERCIAL' NOT NULL,
	"status" "event_status" DEFAULT 'DRAFT' NOT NULL,
	"acompte" integer DEFAULT 0,
	"allow_self_registration" boolean DEFAULT false,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "event_expense_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"issuer_id" uuid NOT NULL,
	"event_id" uuid,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fams_members" (
	"fams_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"is_admin" boolean DEFAULT false,
	CONSTRAINT "fams_members_fams_id_user_id_pk" PRIMARY KEY("fams_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "fams_requests" (
	"fams_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fams_requests_fams_id_user_id_pk" PRIMARY KEY("fams_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "famss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "famss_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "inventory_audit_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"system_stock" double precision NOT NULL,
	"actual_stock" double precision NOT NULL,
	"difference" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" "inventory_audit_status" DEFAULT 'OPEN' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_restocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"quantity" double precision NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mandat_shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandat_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"initial_stock_value" integer NOT NULL,
	"final_stock_value" integer,
	"sales" integer,
	"expenses" integer,
	"benefice" integer
);
--> statement-breakpoint
CREATE TABLE "mandats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"initial_stock_value" integer NOT NULL,
	"final_stock_value" integer,
	"final_benefice" integer,
	"status" "mandat_status" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"fees" json DEFAULT '{"fixed":0,"percentage":0}'::json NOT NULL,
	"config" json DEFAULT '{}'::json,
	CONSTRAINT "payment_methods_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"stock" double precision DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'unit' NOT NULL,
	"fcv" double precision DEFAULT 1 NOT NULL,
	"allow_self_service" boolean DEFAULT false,
	"category_id" uuid NOT NULL,
	"default_quantity" integer DEFAULT 1,
	"active_from" timestamp,
	"active_until" timestamp,
	"event_id" uuid,
	"is_archived" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" json NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_users" (
	"user_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"shop_role_id" uuid,
	CONSTRAINT "shop_users_user_id_shop_id_pk" PRIMARY KEY("user_id","shop_id")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" text,
	"default_margin" integer DEFAULT 10 NOT NULL,
	"is_self_service_enabled" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'COMPLETED' NOT NULL,
	"payment_provider_id" text,
	"wallet_source" "wallet_source" DEFAULT 'PERSONAL' NOT NULL,
	"issuer_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"fams_id" uuid,
	"receiver_user_id" uuid,
	"shop_id" uuid,
	"event_id" uuid,
	"product_id" uuid,
	"quantity" double precision DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"group_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" text NOT NULL,
	"prenom" text NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"phone" text,
	"password_hash" text NOT NULL,
	"role_id" uuid,
	"bucque" text,
	"nums" text,
	"promss" text NOT NULL,
	"tabagnss" "tbk" DEFAULT 'ME' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"is_asleep" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false,
	"reset_password_token" text,
	"reset_password_expires" timestamp with time zone,
	"preferred_dashboard_path" text,
	"image" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_revenues" ADD CONSTRAINT "event_revenues_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_revenues" ADD CONSTRAINT "event_revenues_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_revenues" ADD CONSTRAINT "event_revenues_issuer_id_users_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_expense_splits" ADD CONSTRAINT "event_expense_splits_expense_id_shop_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."shop_expenses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_expense_splits" ADD CONSTRAINT "event_expense_splits_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_expenses" ADD CONSTRAINT "shop_expenses_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_expenses" ADD CONSTRAINT "shop_expenses_issuer_id_users_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_expenses" ADD CONSTRAINT "shop_expenses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fams_members" ADD CONSTRAINT "fams_members_fams_id_famss_id_fk" FOREIGN KEY ("fams_id") REFERENCES "public"."famss"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fams_members" ADD CONSTRAINT "fams_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fams_requests" ADD CONSTRAINT "fams_requests_fams_id_famss_id_fk" FOREIGN KEY ("fams_id") REFERENCES "public"."famss"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fams_requests" ADD CONSTRAINT "fams_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_items" ADD CONSTRAINT "inventory_audit_items_audit_id_inventory_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."inventory_audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audit_items" ADD CONSTRAINT "inventory_audit_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_audits" ADD CONSTRAINT "inventory_audits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_restocks" ADD CONSTRAINT "product_restocks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_restocks" ADD CONSTRAINT "product_restocks_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_restocks" ADD CONSTRAINT "product_restocks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandat_shops" ADD CONSTRAINT "mandat_shops_mandat_id_mandats_id_fk" FOREIGN KEY ("mandat_id") REFERENCES "public"."mandats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandat_shops" ADD CONSTRAINT "mandat_shops_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_roles" ADD CONSTRAINT "shop_roles_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_users" ADD CONSTRAINT "shop_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_users" ADD CONSTRAINT "shop_users_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_users" ADD CONSTRAINT "shop_users_shop_role_id_shop_roles_id_fk" FOREIGN KEY ("shop_role_id") REFERENCES "public"."shop_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_issuer_id_users_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fams_id_famss_id_fk" FOREIGN KEY ("fams_id") REFERENCES "public"."famss"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_user_id_users_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;