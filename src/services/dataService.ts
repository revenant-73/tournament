import { supabase } from '../lib/supabase';
import type { TournamentData, Team, Pool, Match, BracketMatch, Standing } from '../types/tournament';

export const fetchTournamentData = async (): Promise<TournamentData> => {
  try {
    // 1. Fetch Teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .order('name');

    if (teamsError) throw teamsError;
    const teams: Team[] = teamsData || [];

    // 2. Fetch Matches
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        sets (*)
      `)
      .order('created_at');

    if (matchesError) throw matchesError;

    // 3. Process Pool Matches
    const poolNames = Array.from(new Set(teams.map(t => t.pool))).filter(Boolean) as string[];
    const pools: Pool[] = poolNames.map(name => {
      const poolTeams = teams.filter(t => t.pool === name);
      const poolMatches: Match[] = (matchesData || [])
        .filter(m => m.type === 'pool' && m.pool_name === name)
        .map(m => ({
          id: m.id,
          team1: m.team1_name,
          team2: m.team2_name,
          matchScore1: m.match_score1,
          matchScore2: m.match_score2,
          time: m.time,
          court: m.court,
          workTeam: m.work_team,
          status: m.status as Match['status'],
          sets: m.sets.sort((a: any, b: any) => a.set_number - b.set_number).map((s: any) => ({
            score1: s.score1,
            score2: s.score2
          }))
        }));

      return {
        name,
        teams: poolTeams,
        matches: poolMatches,
        standings: calculateStandings(poolTeams, poolMatches)
      };
    });

    // 4. Process Bracket Matches
    const bracket: BracketMatch[] = (matchesData || [])
      .filter(m => m.type === 'bracket')
      .map(m => ({
        id: m.id,
        round: m.round || '',
        label: m.label || '',
        team1: m.team1_name,
        team2: m.team2_name,
        matchScore1: m.match_score1,
        matchScore2: m.match_score2,
        winner: m.winner,
        workTeam: m.work_team,
        bracketName: m.bracket_name || '',
        sets: m.sets.sort((a: any, b: any) => a.set_number - b.set_number).map((s: any) => ({
          score1: s.score1,
          score2: s.score2
        }))
      }));

    return { teams, pools, bracket };
  } catch (error) {
    console.error('Error fetching tournament data from Supabase:', error);
    return { teams: [], pools: [], bracket: [] };
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
    } else if ((m.matchScore2 || 0) > (m.matchScore1 || 0)) {
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
