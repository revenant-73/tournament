import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateStandings } from '../../lib/scoring';
import Layout from '../../components/Layout';

const PoolScreen = () => {
  const { id } = useParams();
  const [pool, setPool] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPoolData() {
      // 1. Fetch pool details
      const { data: poolData } = await supabase
        .from('pools')
        .select('*')
        .eq('id', id)
        .single();
      setPool(poolData);

      // 2. Fetch teams in this pool
      const { data: poolTeamsData } = await supabase
        .from('pool_teams')
        .select('team_id, teams(id, name)')
        .eq('pool_id', id);
      
      const extractedTeams = poolTeamsData?.map(pt => pt.teams) || [];
      setTeams(extractedTeams);

      // 3. Fetch matches in this pool
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('pool_id', id)
        .order('match_order');
      setMatches(matchesData || []);

      setLoading(false);
    }
    fetchPoolData();

    // Subscribe to realtime updates for matches
    const subscription = supabase
      .channel(`pool-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, 
        () => fetchPoolData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  if (loading) return <Layout title="Loading..."><div className="p-8 text-center">Loading Pool...</div></Layout>;
  if (!pool) return <Layout title="Error"><div className="p-8 text-center">Pool not found</div></Layout>;

  const standings = calculateStandings(teams, matches);

  return (
    <Layout title={`${pool.name} • ${pool.court}`}>
      <div className="flex flex-col gap-8">
        
        {/* Standings Table */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2">Live Standings</h3>
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team</th>
                  <th className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">W-L</th>
                  <th className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sets</th>
                  <th className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">+/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {standings.map((team, idx) => (
                  <tr key={team.id} className={idx < 2 ? 'bg-teal-50/20' : ''}>
                    <td className="px-6 py-5 font-black text-slate-800 tracking-tight italic uppercase">{team.name}</td>
                    <td className="px-2 py-5 text-center font-black text-slate-900">{team.matchesWon}-{team.matchesLost}</td>
                    <td className="px-2 py-5 text-center text-slate-600 font-bold">{team.setsWon}-{team.setsLost}</td>
                    <td className="px-2 py-5 text-center text-[10px] font-black text-tvvc-teal">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 px-4 italic font-bold uppercase tracking-widest opacity-60">Wins → Sets → Point Diff</p>
        </section>

        {/* Match Schedule */}
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2">Match Schedule</h3>
          <div className="flex flex-col gap-4">
            {matches.map((match, idx) => {
              const t1 = teams.find(t => t.id === match.team1_id);
              const t2 = teams.find(t => t.id === match.team2_id);
              const isComplete = match.status === 'complete';

              return (
                <div key={match.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border transition-all ${isComplete ? 'border-slate-100 opacity-60' : 'border-teal-100 shadow-md shadow-teal-500/5 scale-[1.02]'}`}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-black text-tvvc-teal uppercase tracking-[0.2em]">Match {match.match_order || idx + 1}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isComplete ? 'bg-slate-100 text-slate-400' : 'bg-teal-50 text-tvvc-teal animate-pulse'}`}>
                      {isComplete ? 'Final' : 'Live Now'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
                    <div className="text-right font-black text-slate-800 uppercase italic tracking-tighter truncate text-sm">{t1?.name || 'TBD'}</div>
                    <div className="flex flex-col items-center min-w-[80px]">
                      {isComplete ? (
                        <div className="text-2xl font-black text-slate-900 italic tracking-tighter">
                          {match.set1_team1 + match.set2_team1 + (match.set3_team1 || 0) > 
                           match.set1_team2 + match.set2_team2 + (match.set3_team2 || 0) ? '2 - 0' : '0 - 2'}
                        </div>
                      ) : (
                        <div className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic bg-slate-50 px-3 py-1 rounded-full">vs</div>
                      )}
                    </div>
                    <div className="text-left font-black text-slate-800 uppercase italic tracking-tighter truncate text-sm">{t2?.name || 'TBD'}</div>
                  </div>

                  {isComplete && (
                    <div className="mt-6 pt-6 border-t border-slate-50 flex justify-center gap-6 text-[10px] font-black text-slate-400 tracking-[0.2em]">
                      <span className="bg-slate-50 px-3 py-1 rounded-lg">{match.set1_team1}-{match.set1_team2}</span>
                      <span className="bg-slate-50 px-3 py-1 rounded-lg">{match.set2_team1}-{match.set2_team2}</span>
                      {match.set3_team1 > 0 && <span className="bg-slate-50 px-3 py-1 rounded-lg">{match.set3_team1}-{match.set3_team2}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default PoolScreen;
