CREATE TABLE `age_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`name` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `brackets` (
	`id` text PRIMARY KEY NOT NULL,
	`age_group_id` text NOT NULL,
	`name` text NOT NULL,
	`round` integer DEFAULT 2 NOT NULL,
	`size` integer DEFAULT 6 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`age_group_id`) REFERENCES `age_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`age_group_id` text NOT NULL,
	`match_type` text NOT NULL,
	`pool_id` text,
	`bracket_id` text,
	`bracket_round` integer,
	`bracket_position` integer,
	`team1_id` text,
	`team2_id` text,
	`ref_team_id` text,
	`court` text,
	`match_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`winner_id` text,
	`source_match1_id` text,
	`source_match2_id` text,
	`set1_team1` integer DEFAULT 0,
	`set1_team2` integer DEFAULT 0,
	`set2_team1` integer DEFAULT 0,
	`set2_team2` integer DEFAULT 0,
	`set3_team1` integer DEFAULT 0,
	`set3_team2` integer DEFAULT 0,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`age_group_id`) REFERENCES `age_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bracket_id`) REFERENCES `brackets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team1_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`team2_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`ref_team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_match1_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_match2_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pool_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`team_id` text NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pool_teams_pool_id_team_id_unique` ON `pool_teams` (`pool_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `pools` (
	`id` text PRIMARY KEY NOT NULL,
	`age_group_id` text NOT NULL,
	`name` text NOT NULL,
	`court` text NOT NULL,
	`round` integer DEFAULT 1 NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`age_group_id`) REFERENCES `age_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`age_group_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`age_group_id`) REFERENCES `age_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`location` text,
	`info` text,
	`is_active` integer DEFAULT true NOT NULL,
	`admin_password` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
