import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateStandings } from '../../lib/scoring';

const PoolsTV = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    async function fetchAllPoolsData() {
      const tId = localStorage.getItem('tournamentId');
      if (!tId) return;

      // 1. Fetch all age groups
      const { data: ageGroups } = await supabase
        .from('age_groups')
        .select('*')
        .eq('tournament_id', tId)
        .order('display_order');

      if (!ageGroups) return;

      // 2. Fetch all pools, teams, and matches for these age groups
      const ageGroupIds = ageGroups.map(ag => ag.id);

      const [
        { data: allPools },
        { data: allTeams },
        { data: allMatches },
        { data: allPoolTeams }
      ] = await Promise.all([
        supabase.from('pools').select('*').in('age_group_id', ageGroupIds).order('display_order'),
        supabase.from('teams').select('*').in('age_group_id', ageGroupIds),
        supabase.from('matches').select('*').in('age_group_id', ageGroupIds).order('match_order'),
        supabase.from('pool_teams').select('pool_id, team_id')
      ]);

      // 3. Organize data
      const organizedData = ageGroups.map(ag => {
        const agPools = allPools?.filter(p => p.age_group_id === ag.id) || [];
        return {
          ...ag,
          pools: agPools.map(p => {
            const pTeams = allPoolTeams
              ?.filter(pt => pt.pool_id === p.id)
              .map(pt => allTeams?.find(t => t.id === pt.team_id))
              .filter(Boolean) || [];
            const pMatches = allMatches?.filter(m => m.pool_id === p.id) || [];
            const standings = calculateStandings(pTeams, pMatches);
            return { ...p, teams: pTeams, matches: pMatches, standings };
          })
        };
      });

      setData(organizedData);
      setLoading(false);
    }

    fetchAllPoolsData();

    // Subscribe to all matches for realtime
    const subscription = supabase
      .channel('pools-tv-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, 
        () => fetchAllPoolsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [navigate]);

  if (loading) return <div className="bg-brand-black min-h-screen text-white flex items-center justify-center p-8">Loading TV View...</div>;

  const allPools = data.flatMap(ag => ag.pools.map(pool => ({ ...pool, ageGroupName: ag.name })));

  return (
    <div className="bg-brand-black min-h-screen text-white p-6 font-sans">
      <div className="flex justify-between items-end mb-8 border-b-2 border-brand-teal/30 pb-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Live <span className="text-brand-teal">Pool Standings</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 mt-1">Tournament Dashboard</p>
        </div>
        <div className="text-right">
          <div className="text-brand-coral font-black animate-pulse uppercase tracking-widest text-xs">● Live Updates</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
        {allPools.map(pool => (
          <div key={pool.id} className="bg-white/5 rounded-[2rem] p-8 border border-white/10 flex flex-col gap-6 shadow-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-teal">{pool.ageGroupName}</span>
                <span className="text-2xl font-black uppercase italic tracking-tighter">{pool.name}</span>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl text-center">
                <span className="block text-[8px] font-black uppercase opacity-40">Court</span>
                <span className="text-sm font-black uppercase italic text-brand-coral">{pool.court}</span>
              </div>
            </div>

            {/* Detailed Standings Table */}
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">
                  <th className="pb-2">Team</th>
                  <th className="pb-2 text-center">M W/L</th>
                  <th className="pb-2 text-center">S W/L</th>
                  <th className="pb-2 text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pool.standings.map((team, idx) => (
                  <tr key={team.id} className={idx < 2 ? 'text-brand-teal bg-brand-teal/5' : 'text-white/80'}>
                    <td className="py-3 text-sm font-black uppercase italic tracking-tight pr-4">
                      <div className="flex items-center gap-3">
                        <span className="opacity-20 text-[10px] tabular-nums">{idx + 1}</span>
                        <span>{team.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm font-black text-center tabular-nums">{team.matchesWon}-{team.matchesLost}</td>
                    <td className="py-3 text-sm font-black text-center tabular-nums opacity-60">{team.setsWon}-{team.setsLost}</td>
                    <td className="py-3 text-sm font-black text-center tabular-nums">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Simplified Recent Results */}
            <div className="mt-2 bg-black/20 rounded-2xl p-4 border border-white/5">
              <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1 h-1 bg-brand-coral rounded-full"></span>
                Match Scores
              </div>
              <div className="grid gap-2">
                {pool.matches.filter(m => m.status === 'complete').length === 0 ? (
                  <div className="text-[10px] font-black text-white/20 uppercase text-center py-2 italic tracking-widest">No scores entered yet</div>
                ) : (
                  pool.matches.map(m => {
                    const t1 = pool.teams.find(t => t.id === m.team1_id);
                    const t2 = pool.teams.find(t => t.id === m.team2_id);
                    
                    if (m.status !== 'complete') return null;

                    // Calculate match score (sets won)
                    let t1Sets = 0;
                    let t2Sets = 0;
                    if (m.set1_team1 > m.set1_team2) t1Sets++; else if (m.set1_team2 > m.set1_team1) t2Sets++;
                    if (m.set2_team1 > m.set2_team2) t1Sets++; else if (m.set2_team2 > m.set2_team1) t2Sets++;
                    if (m.set3_team1 > 0 || m.set3_team2 > 0) {
                      if (m.set3_team1 > m.set3_team2) t1Sets++; else if (m.set3_team2 > m.set3_team1) t2Sets++;
                    }

                    return (
                      <div key={m.id} className="flex justify-between items-center text-[11px] font-black uppercase italic border-b border-white/5 last:border-0 pb-1 last:pb-0">
                        <span className="truncate flex-1 text-white/60">{t1?.name}</span>
                        <span className="px-3 text-brand-coral tabular-nums font-black">{t1Sets}—{t2Sets}</span>
                        <span className="truncate flex-1 text-right text-white/60">{t2?.name}</span>
                      </div>
                    );
                  }).filter(Boolean).slice(-4)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PoolsTV;
