CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seed_key` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`media_url` text,
	`tracking_type` text NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "exercises_category_check" CHECK("exercises"."category" in ('finishing', 'ball_handling', 'dribbling', 'shooting', 'footwork')),
	CONSTRAINT "exercises_tracking_type_check" CHECK("exercises"."tracking_type" in ('makes_attempts', 'check'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_seed_key_unique` ON `exercises` (`seed_key`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`tracking_type` text NOT NULL,
	`target_mode` text,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_exercises_category_check" CHECK("session_exercises"."category" in ('finishing', 'ball_handling', 'dribbling', 'shooting', 'footwork')),
	CONSTRAINT "session_exercises_tracking_type_check" CHECK("session_exercises"."tracking_type" in ('makes_attempts', 'check')),
	CONSTRAINT "session_exercises_target_mode_check" CHECK("session_exercises"."target_mode" is null or "session_exercises"."target_mode" in ('makes', 'attempts'))
);
--> statement-breakpoint
CREATE INDEX `session_exercises_session_id_idx` ON `session_exercises` (`session_id`);--> statement-breakpoint
CREATE TABLE `session_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_exercise_id` integer NOT NULL,
	`position` integer NOT NULL,
	`target_value` integer,
	`logged_value` integer,
	`completed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `session_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_sets_session_exercise_id_idx` ON `session_sets` (`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sessions_status_check" CHECK("sessions"."status" in ('in_progress', 'finished'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_single_in_progress_idx` ON `sessions` (`status`) WHERE "sessions"."status" = 'in_progress';--> statement-breakpoint
CREATE TABLE `template_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_exercise_id` integer NOT NULL,
	`position` integer NOT NULL,
	`target_value` integer,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `template_sets_workout_exercise_id_idx` ON `template_sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`position` integer NOT NULL,
	`target_mode` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workout_exercises_target_mode_check" CHECK("workout_exercises"."target_mode" is null or "workout_exercises"."target_mode" in ('makes', 'attempts'))
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout_id_idx` ON `workout_exercises` (`workout_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workouts_routine_id_idx` ON `workouts` (`routine_id`);