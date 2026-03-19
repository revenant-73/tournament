import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { calculateStandings } from '../../lib/scoring';
import Layout from '../../components/Layout';

const Results = () => {
  const [tournament, setTournament] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState(
    localStorage.getItem('selectedAgeGroupId') || ''
  );
  const [data, setData] = useState({
    pools: [],
    brackets: [],
    teams: [],
    matches: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournament() {
      const { data: tData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_active', true)
        .single();
      setTournament(tData);

      if (tData) {
        const { data: gData } = await supabase
          .from('age_groups')
          .select('*')
          .eq('tournament_id', tData.id)
          .order('display_order');
        setAgeGroups(gData || []);
        
        if (gData?.length > 0 && !selectedAgeGroupId) {
          setSelectedAgeGroupId(gData[0].id);
        }
      }
    }
    fetchTournament();
  }, []);

  useEffect(() => {
    if (selectedAgeGroupId) {
      fetchResults();
    }
  }, [selectedAgeGroupId]);

  async function fetchResults() {
    setLoading(true);
    
    // 1. Fetch Pools
    const { data: pools } = await supabase
      .from('pools')
      .select('*')
      .eq('age_group_id', selectedAgeGroupId)
      .order('display_order');

    // 2. Fetch Brackets
    const { data: brackets } = await supabase
      .from('brackets')
      .select('*')
      .eq('age_group_id', selectedAgeGroupId)
      .order('display_order');

    // 3. Fetch Teams
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('age_group_id', selectedAgeGroupId);

    // 4. Fetch Matches
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('age_group_id', selectedAgeGroupId);

    setData({
      pools: pools || [],
      brackets: brackets || [],
      teams: teams || [],
      matches: matches || []
    });
    setLoading(false);
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading && !tournament) return <Layout title="Results"><div className="p-8 text-center">Loading...</div></Layout>;

  const currentAgeGroup = ageGroups.find(g => g.id === selectedAgeGroupId);

  return (
    <Layout title="Tournament Results">
      <div className="flex flex-col gap-6 py-4 print:p-0">
        
        {/* Controls - Hidden during print */}
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Age Group</label>
            <select 
              value={selectedAgeGroupId} 
              onChange={e => setSelectedAgeGroupId(e.target.value)}
              className="p-3 border rounded-lg outline-none font-semibold bg-white"
            >
              {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <button 
            onClick={handlePrint}
            className="btn btn-primary flex items-center justify-center gap-2 py-3 shadow-lg"
          >
            PDF / Export Results
          </button>
        </div>

        {/* Results Container - Styled for Print */}
        <div id="results-content" className="flex flex-col gap-8 print:gap-12">
          
          {/* Header for Print */}
          <div className="hidden print:flex flex-col items-center text-center border-b-2 border-tvvc-blue pb-6 mb-4">
            <h1 className="text-4xl font-black italic text-tvvc-blue uppercase tracking-tighter">{tournament?.name}</h1>
            <h2 className="text-xl font-bold text-tvvc-orange uppercase tracking-widest mt-1">Final Results • {currentAgeGroup?.name}</h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {tournament?.date && new Date(tournament.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Pool Results */}
          <section className="print:break-inside-avoid">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 print:text-tvvc-blue print:text-sm print:mb-4">Pool Standings</h3>
            <div className="grid gap-6">
              {data.pools.map(pool => {
                const poolMatches = data.matches.filter(m => m.pool_id === pool.id);
                // We need to find which teams are in this pool. In this simple schema, pool_teams junction is used.
                // But for results page, we can infer teams from the matches in the pool if needed, 
                // or fetch pool_teams. Let's assume we have them or can filter them.
                // To keep it simple and efficient, let's filter teams that participated in pool matches.
                const teamIdsInPool = new Set();
                poolMatches.forEach(m => {
                  if (m.team1_id) teamIdsInPool.add(m.team1_id);
                  if (m.team2_id) teamIdsInPool.add(m.team2_id);
                });
                const teamsInPool = data.teams.filter(t => teamIdsInPool.has(t.id));
                const standings = calculateStandings(teamsInPool, poolMatches);

                return (
                  <div key={pool.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-gray-200">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center print:bg-gray-100">
                      <span className="font-bold text-tvvc-blue">{pool.name}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{pool.court}</span>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-gray-50">
                        <tr>
                          <th className="px-4 py-2 font-bold text-gray-400 text-[10px] uppercase">Team</th>
                          <th className="px-2 py-2 font-bold text-gray-400 text-[10px] uppercase text-center">W-L</th>
                          <th className="px-2 py-2 font-bold text-gray-400 text-[10px] uppercase text-center">Sets</th>
                          <th className="px-2 py-2 font-bold text-gray-400 text-[10px] uppercase text-center">Diff</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {standings.map((team, idx) => (
                          <tr key={team.id} className={idx < 2 ? 'bg-blue-50/20' : ''}>
                            <td className="px-4 py-3 font-bold text-gray-900">{team.name}</td>
                            <td className="px-2 py-3 text-center font-bold text-tvvc-blue">{team.matchesWon}-{team.matchesLost}</td>
                            <td className="px-2 py-3 text-center text-gray-600">{team.setsWon}-{team.setsLost}</td>
                            <td className="px-2 py-3 text-center text-xs font-mono text-gray-500">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bracket Results */}
          <section className="print:break-inside-avoid">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2 print:text-tvvc-blue print:text-sm print:mb-4">Bracket Winners</h3>
            <div className="grid gap-4">
              {data.brackets.map(bracket => {
                const finalMatch = data.matches.find(m => 
                  m.bracket_id === bracket.id && 
                  m.bracket_round === 3 && 
                  m.status === 'complete'
                );
                
                const winner = finalMatch ? data.teams.find(t => t.id === finalMatch.winner_id) : null;
                const runnerUp = finalMatch ? data.teams.find(t => t.id === (finalMatch.winner_id === finalMatch.team1_id ? finalMatch.team2_id : finalMatch.team1_id)) : null;

                return (
                  <div key={bracket.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black ${bracket.name.toLowerCase() === 'gold' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                        {bracket.name.toLowerCase() === 'gold' ? '🥇' : '🥈'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-lg text-gray-900 uppercase italic tracking-tight">{bracket.name} CHAMPIONS</h4>
                        <p className="text-tvvc-blue font-bold text-xl">{winner?.name || 'In Progress'}</p>
                        {runnerUp && (
                          <p className="text-xs text-gray-400 font-bold uppercase mt-1">Runner Up: {runnerUp.name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Footer for Print */}
          <div className="hidden print:block mt-auto pt-12 text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
            Tournament Results Powered by TVVC
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .bg-tvvc-blue { color: #1e3a8a !important; }
          .text-tvvc-blue { color: #1e3a8a !important; }
          .text-tvvc-orange { color: #f97316 !important; }
          nav, footer, .print\\:hidden { display: none !important; }
          header { display: none !important; }
          main { padding: 0 !important; }
          .shadow-sm, .shadow-lg { shadow: none !important; }
          #results-content { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}} />
    </Layout>
  );
};

export default Results;
