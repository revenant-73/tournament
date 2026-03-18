/**
 * Scoring Logic & Standings Calculation for TVVC Tournament App
 */

// Rules:
// Sets 1 & 2: First to 25, win by 2
// Set 3 (if needed): First to 15, win by 2
// Match winner: Best of 3 sets

export const validateSetScore = (score1, score2, setIndex) => {
  const target = setIndex < 2 ? 25 : 15;
  const max = Math.max(score1, score2);
  const diff = Math.abs(score1 - score2);

  if (max < target) return false;
  if (max === target && diff < 2) return false;
  if (max > target && diff !== 2) return false;

  return true;
};

export const calculateMatchStats = (sets) => {
  let team1SetsWon = 0;
  let team2SetsWon = 0;
  let team1Points = 0;
  let team2Points = 0;

  sets.forEach((set, index) => {
    if (set.team1 === null || set.team2 === null) return;
    
    team1Points += set.team1;
    team2Points += set.team2;

    if (set.team1 > set.team2) {
      team1SetsWon++;
    } else if (set.team2 > set.team1) {
      team2SetsWon++;
    }
  });

  const winner = team1SetsWon > team2SetsWon ? 1 : (team2SetsWon > team1SetsWon ? 2 : null);

  return {
    winner,
    team1SetsWon,
    team2SetsWon,
    team1Points,
    team2Points,
    isComplete: winner !== null
  };
};

export const calculateStandings = (teams, matches) => {
  const stats = teams.map(team => ({
    ...team,
    matchesWon: 0,
    matchesLost: 0,
    setsWon: 0,
    setsLost: 0,
    pointsScored: 0,
    pointsAllowed: 0,
    pointDifferential: 0
  }));

  const teamStatsMap = stats.reduce((acc, team) => {
    acc[team.id] = team;
    return acc;
  }, {});

  matches.filter(m => m.status === 'complete').forEach(match => {
    const t1 = teamStatsMap[match.team1_id];
    const t2 = teamStatsMap[match.team2_id];

    if (!t1 || !t2) return;

    const matchStats = calculateMatchStats([
      { team1: match.set1_team1, team2: match.set1_team2 },
      { team1: match.set2_team1, team2: match.set2_team2 },
      { team1: match.set3_team1, team2: match.set3_team2 }
    ]);

    t1.setsWon += matchStats.team1SetsWon;
    t1.setsLost += matchStats.team2SetsWon;
    t1.pointsScored += matchStats.team1Points;
    t1.pointsAllowed += matchStats.team2Points;

    t2.setsWon += matchStats.team2SetsWon;
    t2.setsLost += matchStats.team1SetsWon;
    t2.pointsScored += matchStats.team2Points;
    t2.pointsAllowed += matchStats.team1Points;

    if (matchStats.winner === 1) {
      t1.matchesWon++;
      t2.matchesLost++;
    } else if (matchStats.winner === 2) {
      t2.matchesWon++;
      t1.matchesLost++;
    }
  });

  stats.forEach(team => {
    team.pointDifferential = team.pointsScored - team.pointsAllowed;
  });

  // Ranking Order: Matches won -> Sets won -> Point differential
  return stats.sort((a, b) => {
    if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    return b.pointDifferential - a.pointDifferential;
  });
};
