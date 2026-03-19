import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { validateSetScore, calculateMatchStats } from '../../lib/scoring';
import Layout from '../../components/Layout';

const PoolScores = () => {
  const navigate = useNavigate();
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [pools, setPools] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [editingMatch, setEditingMatch] = useState(null);
  const [scores, setScores] = useState({
    s1t1: 0, s1t2: 0,
    s2t1: 0, s2t2: 0,
    s3t1: 0, s3t2: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin');
    fetchAgeGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchPools();
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedPoolId) fetchMatches();
  }, [selectedPoolId]);

  async function fetchAgeGroups() {
    const tId = localStorage.getItem('tournamentId');
    const { data } = await supabase.from('age_groups').select('*').eq('tournament_id', tId).order('display_order');
    if (data) {
      setAgeGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    }
  }

  async function fetchPools() {
    const { data } = await supabase.from('pools').select('*').eq('age_group_id', selectedGroupId).order('display_order');
    if (data) {
      setPools(data);
      if (data.length > 0) setSelectedPoolId(data[0].id);
    }
  }

  async function fetchMatches() {
    const { data } = await supabase.from('matches').select('*').eq('pool_id', selectedPoolId).order('match_order');
    setMatches(data || []);
    
    // Fetch teams for names
    const { data: teamsData } = await supabase.from('teams').select('id, name').eq('age_group_id', selectedGroupId);
    const teamMap = teamsData?.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}) || {};
    setTeams(teamMap);
  }

  const handleEdit = (match) => {
    setEditingMatch(match);
    setScores({
      s1t1: match.set1_team1 || 0, s1t2: match.set1_team2 || 0,
      s2t1: match.set2_team1 || 0, s2t2: match.set2_team2 || 0,
      s3t1: match.set3_team1 || 0, s3t2: match.set3_team2 || 0
    });
  };

  const handleSave = async () => {
    // 1. Validate
    if (!validateSetScore(scores.s1t1, scores.s1t2, 0)) return alert('Invalid Set 1 Score');
    if (!validateSetScore(scores.s2t1, scores.s2t2, 1)) return alert('Invalid Set 2 Score');
    
    const needsSet3 = (scores.s1t1 > scores.s1t2 && scores.s2t1 < scores.s2t2) || 
                      (scores.s1t1 < scores.s1t2 && scores.s2t1 > scores.s2t2);
    
    if (needsSet3 && !validateSetScore(scores.s3t1, scores.s3t2, 2)) return alert('Invalid Set 3 Score');

    // 2. Calculate Stats
    const sets = [
      { team1: scores.s1t1, team2: scores.s1t2 },
      { team1: scores.s2t1, team2: scores.s2t2 }
    ];
    if (needsSet3) sets.push({ team1: scores.s3t1, team2: scores.s3t2 });
    
    const stats = calculateMatchStats(sets);
    const winnerId = stats.winner === 1 ? editingMatch.team1_id : editingMatch.team2_id;

    // 3. Update Supabase
    const { error } = await supabase
      .from('matches')
      .update({
        set1_team1: scores.s1t1, set1_team2: scores.s1t2,
        set2_team1: scores.s2t1, set2_team2: scores.s2t2,
        set3_team1: needsSet3 ? scores.s3t1 : 0, set3_team2: needsSet3 ? scores.s3t2 : 0,
        status: 'complete',
        winner_id: winnerId
      })
      .eq('id', editingMatch.id);

    if (error) alert(error.message);
    else {
      setEditingMatch(null);
      fetchMatches();
    }
  };

  return (
    <Layout title="Pool Score Entry" isAdmin={true}>
      <div className="flex flex-col gap-6 py-2 lg:grid lg:grid-cols-[300px_1fr] lg:items-start lg:gap-12">
        {/* Selectors */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
              <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
                {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Pool</label>
              <select value={selectedPoolId} onChange={e => setSelectedPoolId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
                {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Match List */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
          {matches.map(match => (
            <button 
              key={match.id}
              onClick={() => handleEdit(match)}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 text-left active:scale-[0.98] transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <span>Match {match.match_order}</span>
                <span className={match.status === 'complete' ? 'text-tvvc-teal' : 'text-tvvc-coral animate-pulse'}>{match.status === 'complete' ? 'COMPLETE' : 'PENDING'}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <span className="text-right font-black truncate uppercase italic tracking-tighter text-slate-800">{teams[match.team1_id]}</span>
                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full italic">vs</span>
                <span className="text-left font-black truncate uppercase italic tracking-tighter text-slate-800">{teams[match.team2_id]}</span>
              </div>
              {match.status === 'complete' && (
                <div className="mt-2 pt-4 border-t border-slate-50 flex justify-center gap-6 text-[10px] font-black text-tvvc-teal uppercase tracking-widest">
                  <span className="bg-teal-50 px-3 py-1 rounded-lg">{match.set1_team1}-{match.set1_team2}</span>
                  <span className="bg-teal-50 px-3 py-1 rounded-lg">{match.set2_team1}-{match.set2_team2}</span>
                  {match.set3_team1 > 0 && <span className="bg-teal-50 px-3 py-1 rounded-lg">{match.set3_team1}-{match.set3_team2}</span>}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Edit Modal */}
        {editingMatch && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="bg-tvvc-black p-8 text-white">
                <h3 className="font-black text-center uppercase italic tracking-tighter text-xl leading-none">Enter Match Scores</h3>
                <p className="text-[10px] text-center opacity-40 uppercase font-black mt-3 tracking-[0.2em]">
                  {teams[editingMatch.team1_id]} VS {teams[editingMatch.team2_id]}
                </p>
              </div>
              
              <div className="p-8 flex flex-col gap-8">
                {[1, 2, 3].map(setNum => (
                  <div key={setNum} className="flex flex-col gap-3">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">Set {setNum}</label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6">
                      <input 
                        type="number" 
                        value={scores[`s${setNum}t1`]}
                        onChange={e => setScores({...scores, [`s${setNum}t1`]: parseInt(e.target.value) || 0})}
                        className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-center font-black text-2xl text-tvvc-teal focus:ring-4 focus:ring-tvvc-teal/10 focus:border-tvvc-teal focus:bg-white outline-none transition-all shadow-inner"
                      />
                      <span className="text-slate-200 font-black">—</span>
                      <input 
                        type="number" 
                        value={scores[`s${setNum}t2`]}
                        onChange={e => setScores({...scores, [`s${setNum}t2`]: parseInt(e.target.value) || 0})}
                        className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-center font-black text-2xl text-tvvc-teal focus:ring-4 focus:ring-tvvc-teal/10 focus:border-tvvc-teal focus:bg-white outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex flex-col gap-3 mt-4">
                  <button onClick={handleSave} className="btn btn-primary py-5 uppercase text-[10px] font-black tracking-[0.3em] shadow-xl shadow-teal-500/20">Save Final Score</button>
                  <button onClick={() => setEditingMatch(null)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest py-3 hover:text-rose-400 transition-colors">Discard Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PoolScores;
