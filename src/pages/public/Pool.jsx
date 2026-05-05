import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/db';
import { pools, poolTeams, matches } from '../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { calculateStandings } from '../../lib/scoring';
import Layout from '../../components/Layout';

const PoolScreen = () => {
  const { id } = useParams();
  const [pool, setPool] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matchesList, setMatchesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPoolData() {
      try {
        // 1. Fetch pool details
        const poolData = await db.query.pools.findFirst({
          where: eq(pools.id, id)
        });
        setPool(poolData);

        // 2. Fetch teams in this pool
        const poolTeamsData = await db.query.poolTeams.findMany({
          where: eq(poolTeams.poolId, id),
          with: {
            team: true
          }
        });
        
        const extractedTeams = poolTeamsData?.map(pt => pt.team) || [];
        setTeams(extractedTeams);

        // 3. Fetch matches in this pool
        const matchesData = await db.query.matches.findMany({
          where: eq(matches.poolId, id),
          orderBy: [asc(matches.matchOrder)]
        });
        setMatchesList(matchesData || []);
      } catch (error) {
        console.error('Error fetching pool data:', error);
      }
      setLoading(false);
    }
    fetchPoolData();

    // Note: Turso does not support real-time subscriptions like Supabase.
    // For live updates, you could implement polling with setInterval.
    const interval = setInterval(fetchPoolData, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <Layout title="Loading..."><div className="p-8 text-center">Loading Pool...</div></Layout>;
  if (!pool) return <Layout title="Error"><div className="p-8 text-center">Pool not found</div></Layout>;

  const standings = calculateStandings(teams, matchesList);

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
                {matchesList.map((match, idx) => {
                  const t1 = teams.find(t => t.id === match.team1Id);
                  const t2 = teams.find(t => t.id === match.team2Id);
                  const isComplete = match.status === 'complete';

                  const t1Sets = (match.set1Team1 > match.set1Team2 ? 1 : 0) + 
                                 (match.set2Team1 > match.set2Team2 ? 1 : 0) + 
                                 ((match.set3Team1 || 0) > (match.set3Team2 || 0) ? 1 : 0);
                  const t2Sets = (match.set1Team2 > match.set1Team1 ? 1 : 0) + 
                                 (match.set2Team2 > match.set2Team1 ? 1 : 0) + 
                                 ((match.set3Team2 || 0) > (match.set3Team1 || 0) ? 1 : 0);

                  return (
                    <tr key={match.id} className={!isComplete ? 'bg-teal-50/20' : 'opacity-60'}>
                      <td className="px-4 py-4 text-center font-black text-slate-400 text-xs">
                        {match.matchOrder || idx + 1}
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
                            <span>{match.set1Team1}-{match.set1Team2}</span>
                            <span>{match.set2Team1}-{match.set2Team2}</span>
                            {match.set3Team1 > 0 && <span>{match.set3Team1}-{match.set3Team2}</span>}
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
