import Papa from 'papaparse';
import type { TournamentData, Team, Pool, Match, BracketMatch, Standing } from '../types/tournament';

const SHEET_ID = '1uGW31Y6ey9ULqdWQtEFS6vn72Yy6slTnv5_naooZcMg'; // Replace with real ID

const getCsvUrl = (sheetId: string, sheetName: string) => 
  `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;

const fetchCsv = async (sheetId: string, sheetName: string): Promise<any[]> => {
  const url = getCsvUrl(sheetId, sheetName);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet "${sheetName}": ${response.statusText}`);
  }
  const text = await response.text();
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results: Papa.ParseResult<any>) => resolve(results.data),
    });
  });
};

const parseSets = (m: any) => {
  const sets = [];
  const s1_t1 = parseInt(m.s1_t1);
  const s1_t2 = parseInt(m.s1_t2);
  if (!isNaN(s1_t1) && !isNaN(s1_t2)) sets.push({ score1: s1_t1, score2: s1_t2 });

  const s2_t1 = parseInt(m.s2_t1);
  const s2_t2 = parseInt(m.s2_t2);
  if (!isNaN(s2_t1) && !isNaN(s2_t2)) sets.push({ score1: s2_t1, score2: s2_t2 });

  const s3_t1 = parseInt(m.s3_t1);
  const s3_t2 = parseInt(m.s3_t2);
  if (!isNaN(s3_t1) && !isNaN(s3_t2)) sets.push({ score1: s3_t1, score2: s3_t2 });

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
    const teamsRaw = await fetchCsv(actualSheetId, 'Teams').catch(e => {
      console.error('Failed to fetch Teams sheet:', e);
      return [];
    });
    
    // Fetch all pool sheets
    const poolDataSettled = await Promise.allSettled(
      poolSheetNames.map(name => fetchCsv(actualSheetId, name))
    );

    // Fetch all bracket sheets
    const bracketDataSettled = await Promise.allSettled(
      bracketSheetNames.map(name => fetchCsv(actualSheetId, name))
    );

    const teams: Team[] = teamsRaw.map(t => ({
      id: t.id || t.team_id || t.team_name || Math.random().toString(),
      name: t.name || t.team_name || t.team || 'Unknown Team',
      pool: t.pool || t.pool_name || 'No Pool'
    }));

    const pools: Pool[] = poolSheetNames.map((name, index) => {
      const settledResult = poolDataSettled[index];
      const poolMatchesRaw = settledResult.status === 'fulfilled' ? settledResult.value : [];
      if (settledResult.status === 'rejected') {
        console.error(`Failed to fetch pool sheet "${name}":`, settledResult.reason);
      }

      const poolMatches: Match[] = poolMatchesRaw.map(m => {
        const sets = parseSets(m);
        const { m1, m2 } = calculateMatchScore(sets);
        return {
          id: m.match_id || m.id || Math.random().toString(),
          team1: m.team_1 || m.team1 || 'TBD',
          team2: m.team_2 || m.team2 || 'TBD',
          sets,
          matchScore1: m1,
          matchScore2: m2,
          time: m.time || m.match_time || '',
          court: m.court || m.court_number || '',
          workTeam: m.work_team || m.workteam || '',
          status: (m.status || 'pending').toLowerCase() as Match['status']
        };
      });
      
      // Get teams for this pool from Teams sheet OR from matches if Teams sheet is incomplete
      let poolTeams = teams.filter(t => t.pool === name);
      if (poolTeams.length === 0 && poolMatches.length > 0) {
        // Fallback: Extract team names from matches if not found in Teams sheet
        const uniqueNames = new Set<string>();
        poolMatches.forEach(m => {
          if (m.team1 && m.team1 !== 'TBD') uniqueNames.add(m.team1);
          if (m.team2 && m.team2 !== 'TBD') uniqueNames.add(m.team2);
        });
        poolTeams = Array.from(uniqueNames).map(n => ({ id: n, name: n, pool: name }));
      }
      
      const standings = calculateStandings(poolTeams, poolMatches);
      return { name, teams: poolTeams, matches: poolMatches, standings };
    });

    const bracket: BracketMatch[] = [];
    bracketSheetNames.forEach((name, index) => {
      const settledResult = bracketDataSettled[index];
      const bracketMatchesRaw = settledResult.status === 'fulfilled' ? settledResult.value : [];
      if (settledResult.status === 'rejected') {
        console.error(`Failed to fetch bracket sheet "${name}":`, settledResult.reason);
      }

      bracketMatchesRaw.forEach(b => {
        const sets = parseSets(b);
        const { m1, m2 } = calculateMatchScore(sets);
        bracket.push({
          id: b.match_id || b.id || Math.random().toString(),
          round: b.round || '', 
          label: b.label || b.match_label || '',
          team1: b.team_1 || b.team1 || 'TBD',
          team2: b.team_2 || b.team2 || 'TBD',
          sets,
          matchScore1: m1,
          matchScore2: m2,
          winner: b.winner || '',
          workTeam: b.work_team || b.workteam || '',
          bracketName: name
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
