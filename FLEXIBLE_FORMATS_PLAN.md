# Flexible Tournament Formats Implementation Plan

This plan outlines the steps needed to support dynamic 2nd-round formats, including multi-size brackets and second rounds of pool play (Gold/Silver/Bronze pools).

## Phase 1: Database & Schema Updates

1. **Update `pools` table**:
   - Add `round` integer column (default: 1).
   - Add `parent_pool_id` (optional, for tracing).
2. **Update `brackets` table**:
   - Add `round` integer column (default: 2, but can be 3 if pool play is R2).
   - Add `size` integer column (e.g., 4, 6, 8, 12).
3. **Update `matches` table**:
   - Ensure `bracket_round` and `bracket_position` can handle larger brackets (up to 16 teams).

## Phase 2: Logic & Utilities

1. **Create `bracketGenerator.js`**:
   - Function `generateSingleElim(bracketId, teamCount)`: Returns a structured array of matches with correct seeds and bye placements for 4, 6, 8, and 12-team brackets.
2. **Expand `scoring.js`**:
   - Add `calculateCrossPoolRankings(pools)`: Existing logic, but ensuring it can filter by round.
   - Add `getTeamsByRank(rankRange)`: Helper for seeding specific pools (e.g., teams 1-3 for Gold Pool).

## Phase 3: Admin UI Enhancements

1. **Seeding Page Refactor ([./src/pages/admin/Seeding.jsx](./src/pages/admin/Seeding.jsx))**:
   - Add "Format Selector" (e.g., "6-Team Gold/Silver Brackets", "3x3 Gold/Silver/Bronze Pools", "8-Team Single Bracket").
   - Dynamic seed mapping based on selected format.
   - Support for creating new "Round 2" pools directly from the seeding screen.
2. **Setup Page Updates ([./src/pages/admin/Setup.jsx](./src/pages/admin/Setup.jsx))**:
   - Add ability to manage pools and brackets by round.

## Phase 4: Public View Updates

1. **Public Home/Layout**:
   - Group navigation by round (e.g., "Round 1: Pools", "Round 2: Brackets").
2. **Team Schedule**:
   - Ensure all matches from all rounds are displayed in chronological order for each team.

## Phase 5: Testing & Validation

1. **Verify 9-team format**: 3 pools of 3 (R1) -> 3 pools of 3 (R2).
2. **Verify 12-team format**: 3 pools of 4 (R1) -> 2 brackets of 6 (R2).
3. **Verify 8-team format**: 2 pools of 4 (R1) -> 2 brackets of 4 (R2).
