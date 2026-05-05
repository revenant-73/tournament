/**
 * Utility to generate bracket structures for any team count from 4 to 16.
 */

export const BRACKET_SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

/**
 * Standard bracket seeding order for a power-of-2 size.
 * Returns an array of pairs [seed1, seed2].
 */
const getSeedingPairs = (p) => {
  let seeds = [1, 2];
  while (seeds.length < p) {
    let nextSeeds = [];
    for (let i = 0; i < seeds.length; i++) {
      nextSeeds.push(seeds[i]);
      nextSeeds.push(seeds.length * 2 + 1 - seeds[i]);
    }
    seeds = nextSeeds;
  }
  
  // Convert flat list [1, 16, 8, 9, ...] into pairs
  const pairs = [];
  for (let i = 0; i < seeds.length; i += 2) {
    pairs.push([seeds[i], seeds[i+1]]);
  }
  return pairs;
};

/**
 * Generates matches for a single elimination bracket.
 * Generic for any N.
 */
export const generateBracketMatches = (ageGroupId, bracketId, size, seeds) => {
  const p = Math.pow(2, Math.ceil(Math.log2(size))); // Next power of 2
  const pairs = getSeedingPairs(p);
  const matches = [];

  // Round 1 (Opening Round / QF if 8, R16 if 16)
  // We only create matches for pairs where BOTH seeds are <= size.
  // If seed2 > size, seed1 gets a bye to Round 2.
  
  const round1Matches = [];
  const round2Entrants = []; // { teamId, sourceMatchIndex }

  pairs.forEach((pair, idx) => {
    const [s1, s2] = pair;
    if (s2 <= size) {
      // Both exist, this is a real R1 match
      round1Matches.push({
        ageGroupId: ageGroupId, bracketId: bracketId, matchType: 'bracket',
        bracketRound: 1, bracketPosition: idx + 1,
        team1Id: seeds[s1]?.id, team2Id: seeds[s2]?.id,
        matchOrder: matches.length + 1, status: 'scheduled'
      });
      round2Entrants.push({ sourceIndex: round1Matches.length - 1 });
    } else {
      // Seed 2 doesn't exist, Seed 1 gets a bye
      round2Entrants.push({ teamId: seeds[s1]?.id });
    }
  });

  // Calculate Rounds
  const totalRounds = Math.log2(p);
  
  // For the sake of matching your current DB logic where 1=QF, 2=SF, 3=F:
  // We need to map our generic rounds to those names.
  // If p=8, Rounds are 1, 2, 3.
  // If p=16, Rounds are 0 (R16), 1 (QF), 2 (SF), 3 (F).
  // Let's use 1, 2, 3, 4 for simplicity and adjust Seeding.jsx expectations.

  const allMatches = [...round1Matches];
  let previousRoundEntrants = round2Entrants;

  for (let r = 2; r <= totalRounds; r++) {
    const currentRoundEntrants = [];
    for (let i = 0; i < previousRoundEntrants.length; i += 2) {
      const entrant1 = previousRoundEntrants[i];
      const entrant2 = previousRoundEntrants[i+1];
      
      const match = {
        ageGroupId: ageGroupId, bracketId: bracketId, matchType: 'bracket',
        bracketRound: r, bracketPosition: (i / 2) + 1,
        team1Id: entrant1.teamId || null,
        team2Id: entrant2.teamId || null,
        // placeholder for source_match_ids which caller will fill
        _meta: {
          source1: entrant1.sourceIndex !== undefined ? entrant1.sourceIndex : null,
          source2: entrant2.sourceIndex !== undefined ? entrant2.sourceIndex : null
        },
        matchOrder: allMatches.length + 1, status: 'scheduled'
      };
      
      allMatches.push(match);
      currentRoundEntrants.push({ sourceIndex: allMatches.length - 1 });
    }
    previousRoundEntrants = currentRoundEntrants;
  }

  return allMatches;
};

/**
 * Generates pool play matches for a given set of teams.
 */
export const generatePoolMatches = (ageGroupId, poolId, teamsInPool, startOrder = 1) => {
  let matches = [];
  const count = teamsInPool.length;

  if (count === 3) {
    const schedule = [{ t1: 0, t2: 2 }, { t1: 1, t2: 2 }, { t1: 0, t2: 1 }];
    matches = schedule.map((m, idx) => ({
      ageGroupId: ageGroupId, poolId: poolId, matchType: 'pool',
      team1Id: teamsInPool[m.t1].id, team2Id: teamsInPool[m.t2].id,
      matchOrder: startOrder + idx, status: 'scheduled'
    }));
  } else if (count === 4) {
    const schedule = [{ t1: 0, t2: 2 }, { t1: 1, t2: 3 }, { t1: 0, t2: 3 }, { t1: 1, t2: 2 }, { t1: 2, t2: 3 }, { t1: 0, t2: 1 }];
    matches = schedule.map((m, idx) => ({
      ageGroupId: ageGroupId, poolId: poolId, matchType: 'pool',
      team1Id: teamsInPool[m.t1].id, team2Id: teamsInPool[m.t2].id,
      matchOrder: startOrder + idx, status: 'scheduled'
    }));
  } else {
    // Standard Round Robin
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        matches.push({
          ageGroupId: ageGroupId, poolId: poolId, matchType: 'pool',
          team1Id: teamsInPool[i].id, team2Id: teamsInPool[j].id,
          matchOrder: startOrder + matches.length, status: 'scheduled'
        });
      }
    }
  }
  return matches;
};
