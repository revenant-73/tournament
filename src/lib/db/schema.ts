import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// 1. Tournaments Table
export const tournaments = sqliteTable("tournaments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  date: text("date").notNull(),
  location: text("location"),
  info: text("info"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  adminPassword: text("admin_password").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// 2. Age Groups Table
export const ageGroups = sqliteTable("age_groups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tournamentId: text("tournament_id")
    .notNull()
    .references(() => tournaments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

// 3. Teams Table
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ageGroupId: text("age_group_id")
    .notNull()
    .references(() => ageGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

// 4. Pools Table
export const pools = sqliteTable("pools", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ageGroupId: text("age_group_id")
    .notNull()
    .references(() => ageGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  court: text("court").notNull(),
  round: integer("round").notNull().default(1),
  displayOrder: integer("display_order").notNull().default(0),
});

// 5. Pool Teams Table
export const poolTeams = sqliteTable("pool_teams", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  poolId: text("pool_id")
    .notNull()
    .references(() => pools.id, { onDelete: "cascade" }),
  teamId: text("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
}, (t) => ({
  unq: unique().on(t.poolId, t.teamId),
}));

// 6. Brackets Table
export const brackets = sqliteTable("brackets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ageGroupId: text("age_group_id")
    .notNull()
    .references(() => ageGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  round: integer("round").notNull().default(2),
  size: integer("size").notNull().default(6),
  displayOrder: integer("display_order").notNull().default(0),
});

// 7. Matches Table
export const matches = sqliteTable("matches", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ageGroupId: text("age_group_id")
    .notNull()
    .references(() => ageGroups.id, { onDelete: "cascade" }),
  matchType: text("match_type", { enum: ["pool", "bracket"] }).notNull(),
  poolId: text("pool_id").references(() => pools.id, { onDelete: "cascade" }),
  bracketId: text("bracket_id").references(() => brackets.id, { onDelete: "cascade" }),
  bracketRound: integer("bracket_round"), // 1=QF, 2=SF, 3=Final
  bracketPosition: integer("bracket_position"),
  team1Id: text("team1_id").references(() => teams.id, { onDelete: "set null" }),
  team2Id: text("team2_id").references(() => teams.id, { onDelete: "set null" }),
  refTeamId: text("ref_team_id").references(() => teams.id, { onDelete: "set null" }),
  court: text("court"),
  matchOrder: integer("match_order").notNull().default(0),
  status: text("status", { enum: ["scheduled", "complete"] }).notNull().default("scheduled"),
  winnerId: text("winner_id").references(() => teams.id, { onDelete: "set null" }),
  sourceMatch1Id: text("source_match1_id").references(() => matches.id),
  sourceMatch2Id: text("source_match2_id").references(() => matches.id),
  
  // Scores
  set1Team1: integer("set1_team1").default(0),
  set1Team2: integer("set1_team2").default(0),
  set2Team1: integer("set2_team1").default(0),
  set2Team2: integer("set2_team2").default(0),
  set3Team1: integer("set3_team1").default(0),
  set3Team2: integer("set3_team2").default(0),
  
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  ageGroups: many(ageGroups),
}));

export const ageGroupsRelations = relations(ageGroups, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [ageGroups.tournamentId],
    references: [tournaments.id],
  }),
  teams: many(teams),
  pools: many(pools),
  brackets: many(brackets),
  matches: many(matches),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  ageGroup: one(ageGroups, {
    fields: [teams.ageGroupId],
    references: [ageGroups.id],
  }),
  poolTeams: many(poolTeams),
  matchesAsTeam1: many(matches, { relationName: "team1" }),
  matchesAsTeam2: many(matches, { relationName: "team2" }),
}));

export const poolsRelations = relations(pools, ({ one, many }) => ({
  ageGroup: one(ageGroups, {
    fields: [pools.ageGroupId],
    references: [ageGroups.id],
  }),
  poolTeams: many(poolTeams),
  matches: many(matches),
}));

export const poolTeamsRelations = relations(poolTeams, ({ one }) => ({
  pool: one(pools, {
    fields: [poolTeams.poolId],
    references: [pools.id],
  }),
  team: one(teams, {
    fields: [poolTeams.teamId],
    references: [teams.id],
  }),
}));

export const bracketsRelations = relations(brackets, ({ one, many }) => ({
  ageGroup: one(ageGroups, {
    fields: [brackets.ageGroupId],
    references: [ageGroups.id],
  }),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  ageGroup: one(ageGroups, {
    fields: [matches.ageGroupId],
    references: [ageGroups.id],
  }),
  pool: one(pools, {
    fields: [matches.poolId],
    references: [pools.id],
  }),
  bracket: one(brackets, {
    fields: [matches.bracketId],
    references: [brackets.id],
  }),
  team1: one(teams, {
    fields: [matches.team1Id],
    references: [teams.id],
    relationName: "team1",
  }),
  team2: one(teams, {
    fields: [matches.team2Id],
    references: [teams.id],
    relationName: "team2",
  }),
  refTeam: one(teams, {
    fields: [matches.refTeamId],
    references: [teams.id],
    relationName: "refTeam",
  }),
  winner: one(teams, {
    fields: [matches.winnerId],
    references: [teams.id],
    relationName: "winner",
  }),
}));
