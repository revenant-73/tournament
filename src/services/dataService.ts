import Papa from 'papaparse';
import { TournamentData, Team, Pool, Match, BracketMatch, Standing } from '../types/tournament';

const SHEET_ID = '1uGW31Y6ey9ULqdWQtEFS6vn72Yy6slTnv5_naooZcMg'; // Replace with real ID

const getCsvUrl = (sheetId: string, sheetName: string) => 
  `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;

const fetchCsv = async (sheetId: string, sheetName: string): Promise<any[]> => {
  const url = getCsvUrl(sheetId, sheetName);
  const response = await fetch(url);
  const text = await response.text();
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
    });
  });
};

const parseSets = (m: any) => {
  const sets = [];
  if (m.s1_t1 !== undefined && m.s1_t2 !== undefined) sets.push({ score1: parseInt(m.s1_t1), score2: parseInt(m.s1_t2) });
  if (m.s2_t1 !== undefined && m.s2_t2 !== undefined) sets.push({ score1: parseInt(m.s2_t1), score2: parseInt(m.s2_t2) });
  if (m.s3_t1 !== undefined && m.s3_t2 !== undefined) sets.push({ score1: parseInt(m.s3_t1), score2: parseInt(m.s3_t2) });
  return sets.length > 0 ? sets : undefined;
};

const calculateMatchScore = (sets?: { score1: number; score2: number }[]) => {
  if (!sets) return { m1: 0, m2: 0 };
  let m1 = 0;
  let m2 = 0;
  sets.forEach(s => {
    if (s.score1 > s.score2) m1++;
    else if (s.score2 > s.score1) m2++;
  });
  return { m1, m2 };
};

export const fetchTournamentData = async (sheetId?: string): Promise<TournamentData> => {
  const actualSheetId = sheetId || SHEET_ID;
  
  if (!actualSheetId || actualSheetId === 'YOUR_GOOGLE_SHEET_ID_HERE') {
    return getMockData();
  }

  // Define your sheet names here
  const poolSheetNames = ['Pool A', 'Pool B', 'Pool C'];
  const bracketSheetNames = ['Gold', 'Silver'];

  try {
    const teamsRaw = await fetchCsv(actualSheetId, 'Teams');
    
    // Fetch all pool sheets
    const poolDataRaw = await Promise.all(
      poolSheetNames.map(name => fetchCsv(actualSheetId, name))
    );

    // Fetch all bracket sheets
    const bracketDataRaw = await Promise.all(
      bracketSheetNames.map(name => fetchCsv(actualSheetId, name))
    );

    const teams: Team[] = teamsRaw.map(t => ({
      id: t.id,
      name: t.name,
      pool: t.pool
    }));

    const pools: Pool[] = poolSheetNames.map((name, index) => {
      const poolTeams = teams.filter(t => t.pool === name);
      const poolMatches: Match[] = poolDataRaw[index].map(m => {
        const sets = parseSets(m);
        const { m1, m2 } = calculateMatchScore(sets);
        return {
          id: m.match_id,
          team1: m.team1,
          team2: m.team2,
          sets,
          matchScore1: m1,
          matchScore2: m2,
          time: m.time,
          court: m.court,
          status: m.status || 'pending'
        };
      });
      
      const standings = calculateStandings(poolTeams, poolMatches);
      return { name, teams: poolTeams, matches: poolMatches, standings };
    });

    const bracket: BracketMatch[] = [];
    bracketSheetNames.forEach((name, index) => {
      bracketDataRaw[index].forEach(b => {
        const sets = parseSets(b);
        const { m1, m2 } = calculateMatchScore(sets);
        bracket.push({
          id: b.match_id,
          round: b.round, // This now represents the bracket name if you prefer
          label: b.label,
          team1: b.team1,
          team2: b.team2,
          sets,
          matchScore1: m1,
          matchScore2: m2,
          winner: b.winner,
          bracketName: name // We'll add this to the type
        });
      });
    });

    return { teams, pools, bracket };
  } catch (error) {
    console.error('Error fetching data:', error);
    return getMockData();
  }
};

const calculateStandings = (teams: Team[], matches: Match[]): Standing[] => {
  const standingsMap: Record<string, Standing> = {};
  
  teams.forEach(t => {
    standingsMap[t.name] = {
      teamName: t.name,
      matchWins: 0,
      matchLosses: 0,
      setWins: 0,
      setLosses: 0,
      pointsFor: 0,
      pointsAgainst: 0
    };
  });

  matches.filter(m => m.status === 'completed').forEach(m => {
    const t1 = standingsMap[m.team1];
    const t2 = standingsMap[m.team2];
    if (!t1 || !t2) return;

    if ((m.matchScore1 || 0) > (m.matchScore2 || 0)) {
      t1.matchWins++;
      t2.matchLosses++;
    } else {
      t2.matchWins++;
      t1.matchLosses++;
    }

    m.sets?.forEach(s => {
      t1.setWins += s.score1 > s.score2 ? 1 : 0;
      t1.setLosses += s.score1 < s.score2 ? 1 : 0;
      t2.setWins += s.score2 > s.score1 ? 1 : 0;
      t2.setLosses += s.score2 < s.score1 ? 1 : 0;
      
      t1.pointsFor += s.score1;
      t1.pointsAgainst += s.score2;
      t2.pointsFor += s.score2;
      t2.pointsAgainst += s.score1;
    });
  });

  return Object.values(standingsMap).sort((a, b) => {
    if (b.matchWins !== a.matchWins) return b.matchWins - a.matchWins;
    if (b.setWins !== a.setWins) return b.setWins - a.setWins;
    const ratioA = a.pointsAgainst === 0 ? a.pointsFor : a.pointsFor / a.pointsAgainst;
    const ratioB = b.pointsAgainst === 0 ? b.pointsFor : b.pointsFor / b.pointsAgainst;
    return ratioB - ratioA;
  });
};

const getMockData = (): TournamentData => {
  const teams: Team[] = [
    { id: '1', name: 'Spike Squad', pool: 'Pool A' },
    { id: '2', name: 'Net Rulers', pool: 'Pool A' },
  ];

  const poolMatches: Match[] = [
    { 
      id: 'm1', team1: 'Spike Squad', team2: 'Net Rulers', 
      sets: [{ score1: 25, score2: 20 }, { score1: 25, score2: 22 }],
      matchScore1: 2, matchScore2: 0,
      time: '9:00 AM', court: '1', status: 'completed' 
    }
  ];

  return {
    teams,
    pools: [{ 
      name: 'Pool A', 
      teams, 
      matches: poolMatches, 
      standings: calculateStandings(teams, poolMatches) 
    }],
    bracket: []
  };
};
