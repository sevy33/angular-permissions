ALTER TABLE "projects" ADD COLUMN "api_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_project_id_name_unique" UNIQUE("project_id","name");--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_project_id_key_unique" UNIQUE("project_id","key");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_api_key_unique" UNIQUE("api_key");