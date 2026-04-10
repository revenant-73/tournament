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
                    <td className="px-2 py-5 text-center text-[10px] font-black text-brand-teal">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
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
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                  <th className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matchup</th>
                  <th className="px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sets</th>
                  <th className="hidden sm:table-cell px-2 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Scores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {matches.map((match, idx) => {
                  const t1 = teams.find(t => t.id === match.team1_id);
                  const t2 = teams.find(t => t.id === match.team2_id);
                  const isComplete = match.status === 'complete';

                  const t1Sets = (match.set1_team1 > match.set1_team2 ? 1 : 0) + 
                                 (match.set2_team1 > match.set2_team2 ? 1 : 0) + 
                                 ((match.set3_team1 || 0) > (match.set3_team2 || 0) ? 1 : 0);
                  const t2Sets = (match.set1_team2 > match.set1_team1 ? 1 : 0) + 
                                 (match.set2_team2 > match.set2_team1 ? 1 : 0) + 
                                 ((match.set3_team2 || 0) > (match.set3_team1 || 0) ? 1 : 0);

                  return (
                    <tr key={match.id} className={!isComplete ? 'bg-teal-50/20' : 'opacity-60'}>
                      <td className="px-4 py-4 text-center font-black text-slate-400 text-xs">
                        {match.match_order || idx + 1}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className={`text-xs font-black uppercase italic tracking-tighter ${isComplete && t1Sets > t2Sets ? 'text-slate-900' : 'text-slate-500'}`}>
                            {t1?.name || 'TBD'}
                          </div>
                          <div className={`text-xs font-black uppercase italic tracking-tighter ${isComplete && t2Sets > t1Sets ? 'text-slate-900' : 'text-slate-500'}`}>
                            {t2?.name || 'TBD'}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-4 text-center">
                        {isComplete ? (
                          <div className="text-sm font-black text-slate-900 italic tabular-nums">
                            {t1Sets}-{t2Sets}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-brand-teal uppercase animate-pulse">Live</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-2 py-4 text-center">
                        {isComplete && (
                          <div className="flex justify-center gap-2 text-[10px] font-bold text-slate-400">
                            <span>{match.set1_team1}-{match.set1_team2}</span>
                            <span>{match.set2_team1}-{match.set2_team2}</span>
                            {match.set3_team1 > 0 && <span>{match.set3_team1}-{match.set3_team2}</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default PoolScreen;
