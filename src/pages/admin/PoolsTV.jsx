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

  if (loading) return <div className="bg-tvvc-black min-h-screen text-white flex items-center justify-center p-8">Loading TV View...</div>;

  return (
    <div className="bg-tvvc-black min-h-screen text-white p-4 font-sans overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-tvvc-teal">
          Pool Standings & Results
        </h1>
        <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
          TVVC Live Dashboard
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden h-[calc(100vh-100px)]">
        {data.map(ag => (
          ag.pools.map(pool => (
            <div key={pool.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-tvvc-teal">{ag.name}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{pool.name} • {pool.court}</span>
              </div>

              {/* Standings Mini-Table */}
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[8px] font-black text-white/20 uppercase tracking-widest border-b border-white/5">
                    <th className="pb-1">Team</th>
                    <th className="pb-1 text-center">W-L</th>
                    <th className="pb-1 text-center">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pool.standings.map((team, idx) => (
                    <tr key={team.id} className={idx < 2 ? 'text-tvvc-teal' : 'text-white/60'}>
                      <td className="py-1 text-[11px] font-black uppercase italic truncate max-w-[120px]">{team.name}</td>
                      <td className="py-1 text-[11px] font-black text-center">{team.matchesWon}-{team.matchesLost}</td>
                      <td className="py-1 text-[11px] font-black text-center">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Recent Results */}
              <div className="mt-1">
                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Results</div>
                <div className="grid gap-1">
                  {pool.matches.map(m => {
                    const t1 = pool.teams.find(t => t.id === m.team1_id);
                    const t2 = pool.teams.find(t => t.id === m.team2_id);
                    const isComplete = m.status === 'complete';
                    
                    if (!isComplete) return null;

                    return (
                      <div key={m.id} className="flex justify-between items-center text-[9px] font-bold bg-white/5 px-2 py-1 rounded">
                        <span className="truncate max-w-[60px] uppercase">{t1?.name}</span>
                        <span className="text-tvvc-teal mx-1">
                          {m.set1_team1}-{m.set1_team2}, {m.set2_team1}-{m.set2_team2}{m.set3_team1 > 0 ? `, ${m.set3_team1}-${m.set3_team2}` : ''}
                        </span>
                        <span className="truncate max-w-[60px] uppercase text-right">{t2?.name}</span>
                      </div>
                    );
                  }).filter(Boolean).slice(-3)} {/* Show last 3 results */}
                </div>
              </div>
            </div>
          ))
        ))}
      </div>
    </div>
  );
};

export default PoolsTV;
