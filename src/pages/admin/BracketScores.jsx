import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { validateSetScore, calculateMatchStats } from '../../lib/scoring';
import Layout from '../../components/Layout';

const BracketScores = () => {
  const navigate = useNavigate();
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [brackets, setBrackets] = useState([]);
  const [selectedBracketId, setSelectedBracketId] = useState('');
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [matchScores, setMatchScores] = useState({}); // { matchId: { s1t1, s1t2, ... } }
  const [saving, setSaving] = useState(null); // track which match is saving

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin');
    fetchAgeGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchBrackets();
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedBracketId) fetchMatches();
  }, [selectedBracketId]);

  async function fetchAgeGroups() {
    const tId = localStorage.getItem('tournamentId');
    const { data } = await supabase.from('age_groups').select('*').eq('tournament_id', tId).order('display_order');
    if (data) {
      setAgeGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    }
  }

  async function fetchBrackets() {
    const { data } = await supabase.from('brackets').select('*').eq('age_group_id', selectedGroupId).order('display_order');
    if (data) {
      setBrackets(data);
      if (data.length > 0) setSelectedBracketId(data[0].id);
    }
  }

  async function fetchMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('bracket_id', selectedBracketId)
      .order('bracket_round', { ascending: true })
      .order('bracket_position', { ascending: true });
    
    const matchData = data || [];
    setMatches(matchData);
    
    // Initialize scores
    const scoresMap = {};
    matchData.forEach(m => {
      scoresMap[m.id] = {
        s1t1: m.set1_team1 || 0, s1t2: m.set1_team2 || 0,
        s2t1: m.set2_team1 || 0, s2t2: m.set2_team2 || 0,
        s3t1: m.set3_team1 || 0, s3t2: m.set3_team2 || 0
      };
    });
    setMatchScores(scoresMap);
    
    // Fetch all teams for the age group to map names
    const { data: teamsData } = await supabase.from('teams').select('id, name').eq('age_group_id', selectedGroupId);
    const teamMap = teamsData?.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}) || {};
    setTeams(teamMap);
  }

  const handleScoreChange = (matchId, field, value) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = async (match) => {
    if (!match.team1_id || !match.team2_id) {
      return alert('Cannot save score for incomplete matchups (TBD/BYE)');
    }

    const scores = matchScores[match.id];
    setSaving(match.id);

    // 1. Validate
    if (!validateSetScore(scores.s1t1, scores.s1t2, 0)) {
      setSaving(null);
      return alert('Invalid Set 1 Score');
    }
    if (!validateSetScore(scores.s2t1, scores.s2t2, 1)) {
      setSaving(null);
      return alert('Invalid Set 2 Score');
    }
    
    const needsSet3 = (scores.s1t1 > scores.s1t2 && scores.s2t1 < scores.s2t2) || 
                      (scores.s1t1 < scores.s1t2 && scores.s2t1 > scores.s2t2);
    
    if (needsSet3 && !validateSetScore(scores.s3t1, scores.s3t2, 2)) {
      setSaving(null);
      return alert('Invalid Set 3 Score');
    }

    // 2. Stats & Winner
    const sets = [
      { team1: scores.s1t1, team2: scores.s1t2 },
      { team1: scores.s2t1, team2: scores.s2t2 }
    ];
    if (needsSet3) sets.push({ team1: scores.s3t1, team2: scores.s3t2 });
    
    const stats = calculateMatchStats(sets);
    const winnerId = stats.winner === 1 ? match.team1_id : match.team2_id;

    // 3. Update Match
    const { error } = await supabase
      .from('matches')
      .update({
        set1_team1: scores.s1t1, set1_team2: scores.s1t2,
        set2_team1: scores.s2t1, set2_team2: scores.s2t2,
        set3_team1: needsSet3 ? scores.s3t1 : 0, set3_team2: needsSet3 ? scores.s3t2 : 0,
        status: 'complete',
        winner_id: winnerId
      })
      .eq('id', match.id);

    if (error) {
      setSaving(null);
      return alert(error.message);
    }

    // 4. Auto-Advance Winner
    const { data: targetMatches } = await supabase
      .from('matches')
      .select('*')
      .or(`source_match1_id.eq.${match.id},source_match2_id.eq.${match.id}`);

    if (targetMatches?.length > 0) {
      for (const target of targetMatches) {
        const updateData = {};
        if (target.source_match1_id === match.id) updateData.team1_id = winnerId;
        if (target.source_match2_id === match.id) updateData.team2_id = winnerId;
        
        await supabase.from('matches').update(updateData).eq('id', target.id);
      }
    }

    setSaving(null);
    fetchMatches();
  };

  return (
    <Layout title="Bracket Score Entry" isAdmin={true}>
      <div className="flex flex-col gap-8 py-4">
        {/* Selectors */}
        <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
              {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Bracket</label>
            <select value={selectedBracketId} onChange={e => setSelectedBracketId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
              {brackets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Inline Score Entry Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-black text-white">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">Pos</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">Matchup</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 1</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 2</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 3</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {matches.map(match => {
                const s = matchScores[match.id] || { s1t1: 0, s1t2: 0, s2t1: 0, s2t2: 0, s3t1: 0, s3t2: 0 };
                const t1 = teams[match.team1_id] || (match.source_match1_id ? 'TBD' : 'BYE');
                const t2 = teams[match.team2_id] || (match.source_match2_id ? 'TBD' : 'BYE');
                const isPlaceholder = !match.team1_id || !match.team2_id;

                return (
                  <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-black text-slate-300">R{match.bracket_round} P{match.bracket_position}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-black uppercase italic tracking-tighter ${match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-slate-800'}`}>{t1}</span>
                        <span className={`text-sm font-black uppercase italic tracking-tighter ${match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-slate-800'}`}>{t2}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center">
                        <input 
                          type="number"
                          disabled={isPlaceholder}
                          value={s.s1t1 === 0 ? '' : s.s1t1}
                          onChange={e => handleScoreChange(match.id, 's1t1', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none disabled:opacity-30"
                        />
                        <input 
                          type="number"
                          disabled={isPlaceholder}
                          value={s.s1t2 === 0 ? '' : s.s1t2}
                          onChange={e => handleScoreChange(match.id, 's1t2', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none disabled:opacity-30"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center">
                        <input 
                          type="number"
                          disabled={isPlaceholder}
                          value={s.s2t1 === 0 ? '' : s.s2t1}
                          onChange={e => handleScoreChange(match.id, 's2t1', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none disabled:opacity-30"
                        />
                        <input 
                          type="number"
                          disabled={isPlaceholder}
                          value={s.s2t2 === 0 ? '' : s.s2t2}
                          onChange={e => handleScoreChange(match.id, 's2t2', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none disabled:opacity-30"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center">
                        <input 
                          type="number"
                          disabled={isPlaceholder}
                          value={s.s3t1 === 0 ? '' : s.s3t1}
                          onChange={e => handleScoreChange(match.id, 's3t1', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none disabled:opacity-30"
                        />
                        <input 
                          type="number"
                          disabled={isPlaceholder}
                          value={s.s3t2 === 0 ? '' : s.s3t2}
                          onChange={e => handleScoreChange(match.id, 's3t2', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none disabled:opacity-30"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${match.status === 'complete' ? 'text-brand-teal' : 'text-brand-coral animate-pulse'}`}>
                        {match.status === 'complete' ? 'COMPLETE' : (isPlaceholder ? 'WAITING' : 'PENDING')}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleSave(match)}
                        disabled={saving === match.id || isPlaceholder}
                        className="bg-brand-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-teal transition-colors disabled:opacity-50"
                      >
                        {saving === match.id ? '...' : 'SAVE'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default BracketScores;
