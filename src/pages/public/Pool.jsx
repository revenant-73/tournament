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
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Live Standings</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 font-bold text-gray-500">Team</th>
                  <th className="px-2 py-2 font-bold text-gray-500 text-center">W-L</th>
                  <th className="px-2 py-2 font-bold text-gray-500 text-center">Sets</th>
                  <th className="px-2 py-2 font-bold text-gray-500 text-center">+/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {standings.map((team, idx) => (
                  <tr key={team.id} className={idx < 2 ? 'bg-blue-50/30' : ''}>
                    <td className="px-4 py-3 font-bold text-gray-900">{team.name}</td>
                    <td className="px-2 py-3 text-center font-semibold">{team.matchesWon}-{team.matchesLost}</td>
                    <td className="px-2 py-3 text-center">{team.setsWon}-{team.setsLost}</td>
                    <td className="px-2 py-3 text-center text-xs font-mono">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-2 italic">Tiebreaker: Wins → Sets → Point Diff</p>
        </section>

        {/* Match Schedule */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Match Schedule</h3>
          <div className="flex flex-col gap-3">
            {matches.map((match, idx) => {
              const t1 = teams.find(t => t.id === match.team1_id);
              const t2 = teams.find(t => t.id === match.team2_id);
              const isComplete = match.status === 'complete';

              return (
                <div key={match.id} className={`bg-white p-4 rounded-xl shadow-sm border ${isComplete ? 'border-gray-100 opacity-80' : 'border-blue-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-tvvc-blue uppercase tracking-tight">Match {match.match_order || idx + 1}</span>
                    <span className={`text-[10px] font-bold uppercase ${isComplete ? 'text-gray-400' : 'text-tvvc-orange'}`}>
                      {isComplete ? 'Final' : 'Scheduled'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="text-right font-bold truncate">{t1?.name || 'TBD'}</div>
                    <div className="flex flex-col items-center min-w-[60px]">
                      {isComplete ? (
                        <div className="text-xl font-black text-gray-900">
                          {match.set1_team1 + match.set2_team1 + (match.set3_team1 || 0) > 
                           match.set1_team2 + match.set2_team2 + (match.set3_team2 || 0) ? '2 - 0' : '0 - 2'}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-gray-300 italic">vs</div>
                      )}
                    </div>
                    <div className="text-left font-bold truncate">{t2?.name || 'TBD'}</div>
                  </div>

                  {isComplete && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-center gap-4 text-[11px] font-mono text-gray-500">
                      <span>{match.set1_team1}-{match.set1_team2}</span>
                      <span>{match.set2_team1}-{match.set2_team2}</span>
                      {match.set3_team1 > 0 && <span>{match.set3_team1}-{match.set3_team2}</span>}
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
