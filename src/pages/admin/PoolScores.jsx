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
    <Layout title="Pool Score Entry">
      <div className="flex flex-col gap-6 py-2">
        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3">
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

        {/* Match List */}
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <button 
              key={match.id}
              onClick={() => handleEdit(match)}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2 text-left active:bg-gray-50"
            >
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Match {match.match_order}</span>
                <span className={match.status === 'complete' ? 'text-green-500' : 'text-tvvc-orange'}>{match.status}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <span className="text-right font-bold truncate">{teams[match.team1_id]}</span>
                <span className="text-xs text-gray-300 italic">vs</span>
                <span className="text-left font-bold truncate">{teams[match.team2_id]}</span>
              </div>
              {match.status === 'complete' && (
                <div className="mt-2 pt-2 border-t border-gray-50 flex justify-center gap-4 text-[11px] font-mono font-bold text-tvvc-blue">
                  <span>{match.set1_team1}-{match.set1_team2}</span>
                  <span>{match.set2_team1}-{match.set2_team2}</span>
                  {match.set3_team1 > 0 && <span>{match.set3_team1}-{match.set3_team2}</span>}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Edit Modal */}
        {editingMatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-tvvc-blue p-4 text-white">
                <h3 className="font-bold text-center uppercase italic tracking-tighter">Enter Match Scores</h3>
                <p className="text-[10px] text-center opacity-80 uppercase font-bold mt-1 tracking-widest">
                  {teams[editingMatch.team1_id]} vs {teams[editingMatch.team2_id]}
                </p>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                {[1, 2, 3].map(setNum => (
                  <div key={setNum} className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Set {setNum}</label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <input 
                        type="number" 
                        value={scores[`s${setNum}t1`]}
                        onChange={e => setScores({...scores, [`s${setNum}t1`]: parseInt(e.target.value) || 0})}
                        className="p-3 bg-gray-50 border rounded-xl text-center font-black text-xl text-tvvc-blue focus:ring-2 ring-tvvc-blue outline-none"
                      />
                      <span className="text-gray-300 font-bold">—</span>
                      <input 
                        type="number" 
                        value={scores[`s${setNum}t2`]}
                        onChange={e => setScores({...scores, [`s${setNum}t2`]: parseInt(e.target.value) || 0})}
                        className="p-3 bg-gray-50 border rounded-xl text-center font-black text-xl text-tvvc-blue focus:ring-2 ring-tvvc-blue outline-none"
                      />
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => setEditingMatch(null)} className="btn bg-gray-100 text-gray-500 py-3 uppercase text-xs font-bold">Cancel</button>
                  <button onClick={handleSave} className="btn btn-primary py-3 uppercase text-xs font-bold">Save Final</button>
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
