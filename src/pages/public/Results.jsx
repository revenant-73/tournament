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
        <div className="flex flex-col gap-5 print:hidden">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Select Division</label>
            <select 
              value={selectedAgeGroupId} 
              onChange={e => setSelectedAgeGroupId(e.target.value)}
              className="p-4 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-slate-800 transition-all shadow-sm focus:ring-4 focus:ring-tvvc-teal/10"
            >
              {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <button 
            onClick={handlePrint}
            className="btn btn-primary flex items-center justify-center gap-3 py-5 shadow-2xl shadow-teal-500/20 text-sm uppercase tracking-[0.2em]"
          >
            <span>📄</span> Export Tournament PDF
          </button>
        </div>

        {/* Results Container - Styled for Print */}
        <div id="results-content" className="flex flex-col gap-10 print:gap-12">
          
          {/* Header for Print */}
          <div className="hidden print:flex flex-col items-center text-center border-b-4 border-tvvc-black pb-8 mb-6">
            <h1 className="text-5xl font-black italic text-tvvc-black uppercase tracking-tighter leading-none mb-2">
              <span className="text-tvvc-teal">T</span>VVC TOURNAMENT
            </h1>
            <h2 className="text-2xl font-black text-slate-400 uppercase tracking-[0.4em] mt-2">{tournament?.name}</h2>
            <div className="flex items-center gap-4 mt-4">
              <span className="h-[2px] w-8 bg-tvvc-teal"></span>
              <p className="text-sm text-slate-900 font-black uppercase tracking-widest italic">
                {currentAgeGroup?.name} Division • Final Results
              </p>
              <span className="h-[2px] w-8 bg-tvvc-teal"></span>
            </div>
          </div>

          {/* Pool Results */}
          <section className="print:break-inside-avoid">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2 print:text-tvvc-black print:text-xs print:mb-6">Pool Performance</h3>
            <div className="grid gap-8">
              {data.pools.map(pool => {
                const poolMatches = data.matches.filter(m => m.pool_id === pool.id);
                const teamIdsInPool = new Set();
                poolMatches.forEach(m => {
                  if (m.team1_id) teamIdsInPool.add(m.team1_id);
                  if (m.team2_id) teamIdsInPool.add(m.team2_id);
                });
                const teamsInPool = data.teams.filter(t => teamIdsInPool.has(t.id));
                const standings = calculateStandings(teamsInPool, poolMatches);

                return (
                  <div key={pool.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-slate-200">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center print:bg-slate-50">
                      <span className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{pool.name}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pool.court}</span>
                    </div>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-slate-50">
                        <tr>
                          <th className="px-6 py-4 font-black text-slate-300 text-[10px] uppercase tracking-widest">Team</th>
                          <th className="px-2 py-4 font-black text-slate-300 text-[10px] uppercase tracking-widest text-center">W-L</th>
                          <th className="px-2 py-4 font-black text-slate-300 text-[10px] uppercase tracking-widest text-center">Sets</th>
                          <th className="px-2 py-4 font-black text-slate-300 text-[10px] uppercase tracking-widest text-center">+/-</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {standings.map((team, idx) => (
                          <tr key={team.id} className={idx < 2 ? 'bg-teal-50/10' : ''}>
                            <td className="px-6 py-5 font-black text-slate-800 uppercase italic tracking-tighter">{team.name}</td>
                            <td className="px-2 py-5 text-center font-black text-tvvc-teal">{team.matchesWon}-{team.matchesLost}</td>
                            <td className="px-2 py-5 text-center text-slate-500 font-bold">{team.setsWon}-{team.setsLost}</td>
                            <td className="px-2 py-5 text-center text-[10px] font-black text-slate-400">{team.pointDifferential > 0 ? '+' : ''}{team.pointDifferential}</td>
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
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2 print:text-tvvc-black print:text-xs print:mb-6">Podium Finishers</h3>
            <div className="grid gap-6">
              {data.brackets.map(bracket => {
                const finalMatch = data.matches.find(m => 
                  m.bracket_id === bracket.id && 
                  m.bracket_round === 3 && 
                  m.status === 'complete'
                );
                
                const winner = finalMatch ? data.teams.find(t => t.id === finalMatch.winner_id) : null;
                const runnerUp = finalMatch ? data.teams.find(t => t.id === (finalMatch.winner_id === finalMatch.team1_id ? finalMatch.team2_id : finalMatch.team1_id)) : null;

                return (
                  <div key={bracket.id} className="bg-tvvc-black p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print:shadow-none print:bg-slate-50 print:border-slate-200 group">
                    <div className="flex items-center gap-8">
                      <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-4xl font-black shadow-2xl transition-transform group-hover:scale-110 ${bracket.name.toLowerCase() === 'gold' ? 'bg-tvvc-teal text-white shadow-teal-500/20' : 'bg-tvvc-coral text-white shadow-rose-500/20'}`}>
                        {bracket.name.toLowerCase() === 'gold' ? '🥇' : '🥈'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-[10px] text-white/40 uppercase tracking-[0.3em] mb-2">{bracket.name} CHAMPIONS</h4>
                        <p className="text-white font-black text-3xl italic uppercase tracking-tighter leading-none mb-3">{winner?.name || 'In Progress'}</p>
                        {runnerUp && (
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">Runner Up:</span>
                             <span className="text-xs text-white/60 font-black uppercase tracking-tight">{runnerUp.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Footer for Print */}
          <div className="hidden print:block mt-auto pt-16 text-center text-[10px] text-slate-300 font-black uppercase tracking-[0.5em]">
            Official Tournament Document • TVVC Volleyball
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .bg-tvvc-black { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
          .text-tvvc-teal { color: #14b8a6 !important; -webkit-print-color-adjust: exact; }
          .bg-tvvc-teal { background: #14b8a6 !important; -webkit-print-color-adjust: exact; }
          .bg-tvvc-coral { background: #f43f5e !important; -webkit-print-color-adjust: exact; }
          nav, footer, .print\\:hidden { display: none !important; }
          header { display: none !important; }
          main { padding: 0 !important; }
          .shadow-sm, .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          #results-content { width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}} />
    </Layout>
  );
};

export default Results;
