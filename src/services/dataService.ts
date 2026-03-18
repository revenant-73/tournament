import Papa from 'papaparse';
import type { TournamentData, Team, Pool, Match, BracketMatch, Standing } from '../types/tournament';

const SHEET_ID = '2PACX-1vQVA8BQZzTimzI45uXyUlmveJNWATwaNUQaeIBPa73RqxkktCqX-F0wcqK1Wif0-dCA8hvAEYg99vjz';

const getCsvUrl = (sheetId: string, sheetName: string) => {
  // If it's a published URL ID (starts with 2PACX)
  if (sheetId.startsWith('2PACX')) {
    return `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${encodeURIComponent(sheetName)}`;
  }
  // Standard sheet ID
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
};

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
      complete: (results: Papa.ParseResult<any>) => {
        if (results.data && results.data.length > 0) {
          const headers = Object.keys(results.data[0]);
          console.log(`Sheet "${sheetName}" headers:`, headers);
          
          // CRITICAL CHECK: If a match sheet looks like the teams sheet, Google is returning the wrong tab
          if (sheetName !== 'Teams' && headers.includes('pool') && !headers.includes('team_1') && !headers.includes('team1')) {
            console.error(`ERROR: Sheet "${sheetName}" is returning TEAMS data instead of MATCH data. 
            Check "Publish to the Web" settings and ensure "Entire Document" is selected.`);
          }
        }
        resolve(results.data);
      },
    });
  });
};

const parseSets = (m: any) => {
  const sets = [];
  for (let i = 1; i <= 3; i++) {
    // Try various column name formats (s1_t1, set1_t1, set1_team1, etc.)
    const score1 = parseInt(
      m[`s${i}_t1`] || m[`set${i}_t1`] || m[`set${i}_team1`] || m[`s${i}_team1`] || m[`set_${i}_team_1`] || 
      m[`s${i}_score1`] || m[`set${i}_score1`] || m[`set_${i}_score_1`] || m[`s_${i}_score_1`] ||
      m[`s${i}_1`] || m[`set_${i}_1`] || m[`s_${i}_t_1`]
    );
    const score2 = parseInt(
      m[`s${i}_t2`] || m[`set${i}_t2`] || m[`set${i}_team2`] || m[`s${i}_team2`] || m[`set_${i}_team_2`] ||
      m[`s${i}_score2`] || m[`set${i}_score2`] || m[`set_${i}_score_2`] || m[`s_${i}_score_2`] ||
      m[`s${i}_2`] || m[`set_${i}_2`] || m[`s_${i}_t_2`]
    );
    
    if (!isNaN(score1) && !isNaN(score2)) {
      sets.push({ score1, score2 });
    }
  }
  return sets.length > 0 ? sets : undefined;
};

const getMatchValue = (m: any, aliases: string[]) => {
  for (const alias of aliases) {
    if (m[alias] !== undefined && m[alias] !== null && m[alias].toString().trim() !== '') {
      return m[alias].toString().trim();
    }
  }
  return '';
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

    const teams: Team[] = teamsRaw.map(t => {
      const rawPool = (t.pool || t.pool_name || 'No Pool').trim();
      // Try to match short name like "C" to sheet name like "Pool C"
      const matchedSheet = poolSheetNames.find(ps => 
        ps.toLowerCase() === rawPool.toLowerCase() || 
        ps.toLowerCase() === `pool ${rawPool.toLowerCase()}`
      );
      
      return {
        id: t.id || t.team_id || t.team_name || Math.random().toString(),
        name: t.name || t.team_name || t.team || 'Unknown Team',
        pool: matchedSheet || rawPool
      };
    });

    const pools: Pool[] = poolSheetNames.map((name, index) => {
      const settledResult = poolDataSettled[index];
      const poolMatchesRaw = settledResult.status === 'fulfilled' ? settledResult.value : [];
      if (settledResult.status === 'rejected') {
        console.error(`Failed to fetch pool sheet "${name}":`, settledResult.reason);
      }

      const poolMatches: Match[] = poolMatchesRaw.map(m => {
        const sets = parseSets(m);
        const { m1, m2 } = calculateMatchScore(sets);
        // Ensure winner is calculated if not explicitly provided
        const status = (m.status || (sets ? 'completed' : 'pending')).toLowerCase() as Match['status'];
        
        return {
          id: getMatchValue(m, ['match_id', 'id', 'match', '#', 'match_#']) || Math.random().toString().substring(0, 5),
          team1: getMatchValue(m, ['team_1', 'team1', 't1', 'team_one']),
          team2: getMatchValue(m, ['team_2', 'team2', 't2', 'team_two']),
          sets,
          matchScore1: m1,
          matchScore2: m2,
          time: getMatchValue(m, ['time', 'match_time', 'start_time']),
          court: getMatchValue(m, ['court', 'court_number', 'ct']),
          workTeam: getMatchValue(m, ['work_team', 'workteam', 'work', 'ref']),
          status
        };
      });

      console.log(`Pool ${name}: found ${poolMatches.length} matches`);
      if (poolMatches.length > 0) {
        console.log(`First match for ${name}:`, poolMatches[0]);
      }
      
      // Get teams for this pool from normalized Teams list
      let poolTeams = teams.filter(t => t.pool === name);
      
      // Fallback: If Teams list is empty for this pool, extract from matches
      if (poolTeams.length === 0 && poolMatches.length > 0) {
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
          id: getMatchValue(b, ['match_id', 'id', 'match', '#', 'match_#']) || Math.random().toString().substring(0, 5),
          round: b.round || '', 
          label: getMatchValue(b, ['label', 'match_label', 'game']),
          team1: getMatchValue(b, ['team_1', 'team1', 't1', 'team_one']),
          team2: getMatchValue(b, ['team_2', 'team2', 't2', 'team_two']),
          sets,
          matchScore1: m1,
          matchScore2: m2,
          winner: b.winner || '',
          workTeam: getMatchValue(b, ['work_team', 'workteam', 'work', 'ref']),
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
    standingsMap[t.name.trim()] = {
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
    const t1 = standingsMap[m.team1.trim()];
    const t2 = standingsMap[m.team2.trim()];
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
    { id: '1', name: 'Team 9', pool: 'Pool C' },
    { id: '2', name: 'Team 11', pool: 'Pool C' },
    { id: '3', name: 'Team 10', pool: 'Pool C' },
  ];

  const poolMatches: Match[] = [
    { 
      id: 'c_m1', team1: 'Team 9', team2: 'Team 11', 
      workTeam: 'Team 10',
      sets: [{ score1: 25, score2: 20 }],
      matchScore1: 1, matchScore2: 0,
      time: '10:00 AM', court: '3', status: 'completed' 
    }
  ];

  return {
    teams,
    pools: [{ 
      name: 'Pool C', 
      teams, 
      matches: poolMatches, 
      standings: calculateStandings(teams, poolMatches) 
    }],
    bracket: []
  };
};
