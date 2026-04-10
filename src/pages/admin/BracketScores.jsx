import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { validateSetScore, calculateMatchStats } from '../../lib/scoring';
import Layout from '../../components/Layout';

const BracketScores = () => {
  const navigate = useNavigate();
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  const [secondRoundItems, setSecondRoundItems] = useState([]); // List of { id, name, type: 'pool'|'bracket', round }
  const [selectedItem, setSelectedItem] = useState(null); // { id, type }
  
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [matchScores, setMatchScores] = useState({}); 
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin');
    fetchAgeGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchSecondRoundItems();
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedItem) fetchMatches();
  }, [selectedItem]);

  async function fetchAgeGroups() {
    const tId = localStorage.getItem('tournamentId');
    const { data } = await supabase.from('age_groups').select('*').eq('tournament_id', tId).order('display_order');
    if (data) {
      setAgeGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    }
  }

  async function fetchSecondRoundItems() {
    const [ { data: pools }, { data: brackets } ] = await Promise.all([
      supabase.from('pools').select('*').eq('age_group_id', selectedGroupId).gt('round', 1).order('round').order('display_order'),
      supabase.from('brackets').select('*').eq('age_group_id', selectedGroupId).order('round').order('display_order')
    ]);

    const items = [
      ...(pools || []).map(p => ({ id: p.id, name: p.name, type: 'pool', round: p.round })),
      ...(brackets || []).map(b => ({ id: b.id, name: b.name, type: 'bracket', round: b.round }))
    ];

    setSecondRoundItems(items);
    if (items.length > 0) {
      setSelectedItem({ id: items[0].id, type: items[0].type });
    } else {
      setSelectedItem(null);
      setMatches([]);
    }
  }

  async function fetchMatches() {
    let query = supabase.from('matches').select('*');
    
    if (selectedItem.type === 'pool') {
      query = query.eq('pool_id', selectedItem.id).order('match_order');
    } else {
      query = query.eq('bracket_id', selectedItem.id).order('bracket_round', { ascending: true }).order('bracket_position', { ascending: true });
    }

    const { data } = await query;
    const matchData = data || [];
    setMatches(matchData);
    
    const scoresMap = {};
    matchData.forEach(m => {
      scoresMap[m.id] = {
        s1t1: m.set1_team1 || 0, s1t2: m.set1_team2 || 0,
        s2t1: m.set2_team1 || 0, s2t2: m.set2_team2 || 0,
        s3t1: m.set3_team1 || 0, s3t2: m.set3_team2 || 0,
        court: m.court || ''
      };
    });
    setMatchScores(scoresMap);
    
    const { data: teamsData } = await supabase.from('teams').select('id, name').eq('age_group_id', selectedGroupId);
    const teamMap = teamsData?.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}) || {};
    setTeams(teamMap);
  }

  const handleScoreChange = (matchId, field, value) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: field === 'court' ? value : (parseInt(value) || 0)
      }
    }));
  };

  const handleSave = async (match) => {
    const scores = matchScores[match.id];
    setSaving(match.id);

    const isPlaceholder = selectedItem.type === 'bracket' && (!match.team1_id || !match.team2_id);
    let winnerId = match.winner_id;
    let status = match.status;

    const hasScores = scores.s1t1 > 0 || scores.s1t2 > 0 || 
                      scores.s2t1 > 0 || scores.s2t2 > 0 || 
                      scores.s3t1 > 0 || scores.s3t2 > 0;

    if (!isPlaceholder && hasScores) {
      if (!validateSetScore(scores.s1t1, scores.s1t2, 0)) {
        setSaving(null);
        return alert('Invalid Set 1 Score');
      }
      if (!validateSetScore(scores.s2t1, scores.s2t2, 1)) {
        setSaving(null);
        return alert('Invalid Set 2 Score');
      }
      const needsSet3 = (scores.s1t1 > scores.s1t2 && scores.s2t1 < scores.s2t2) || (scores.s1t1 < scores.s1t2 && scores.s2t1 > scores.s2t2);
      if (needsSet3 && !validateSetScore(scores.s3t1, scores.s3t2, 2)) {
        setSaving(null);
        return alert('Invalid Set 3 Score');
      }

      const sets = [{ team1: scores.s1t1, team2: scores.s1t2 }, { team1: scores.s2t1, team2: scores.s2t2 }];
      if (needsSet3) sets.push({ team1: scores.s3t1, team2: scores.s3t2 });
      
      const stats = calculateMatchStats(sets);
      winnerId = stats.winner === 1 ? match.team1_id : match.team2_id;
      status = 'complete';
    } else if (!isPlaceholder && !hasScores) {
      status = 'scheduled';
      winnerId = null;
    }

    const { error } = await supabase
      .from('matches')
      .update({
        set1_team1: scores.s1t1, set1_team2: scores.s1t2,
        set2_team1: scores.s2t1, set2_team2: scores.s2t2,
        set3_team1: scores.s3t1, set3_team2: scores.s3t2,
        court: scores.court, status: status, winner_id: winnerId
      })
      .eq('id', match.id);

    if (error) {
      setSaving(null);
      return alert(error.message);
    }

    // Auto-Advance for Brackets
    if (selectedItem.type === 'bracket' && status === 'complete' && winnerId) {
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
    }

    setSaving(null);
    fetchMatches();
  };

  const renderMatchTable = (matchList, title) => (
    <div className="flex flex-col gap-4 mb-8">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] px-2 border-l-4 border-brand-teal pl-3">
        {title}
      </h3>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-brand-black text-white">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">{selectedItem.type === 'pool' ? '#' : 'Pos'}</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">Matchup</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 1</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 2</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 3</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Court</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Status</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {matchList.map(match => {
              const s = matchScores[match.id] || { s1t1: 0, s1t2: 0, s2t1: 0, s2t2: 0, s3t1: 0, s3t2: 0, court: '' };
              const t1 = teams[match.team1_id] || (match.source_match1_id ? 'TBD' : 'BYE');
              const t2 = teams[match.team2_id] || (match.source_match2_id ? 'TBD' : 'BYE');
              const isPlaceholder = selectedItem.type === 'bracket' && (!match.team1_id || !match.team2_id);

              return (
                <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-xs font-black text-slate-300">
                    {selectedItem.type === 'pool' ? `M${match.match_order}` : `P${match.bracket_position}`}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm font-black uppercase italic tracking-tighter ${match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-slate-800'}`}>{t1}</span>
                      <span className={`text-sm font-black uppercase italic tracking-tighter ${match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-slate-800'}`}>{t2}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2 items-center">
                      <input type="number" disabled={isPlaceholder} value={s.s1t1 === 0 ? '' : s.s1t1} onChange={e => handleScoreChange(match.id, 's1t1', e.target.value)} className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 outline-none disabled:opacity-30"/>
                      <input type="number" disabled={isPlaceholder} value={s.s1t2 === 0 ? '' : s.s1t2} onChange={e => handleScoreChange(match.id, 's1t2', e.target.value)} className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 outline-none disabled:opacity-30"/>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2 items-center">
                      <input type="number" disabled={isPlaceholder} value={s.s2t1 === 0 ? '' : s.s2t1} onChange={e => handleScoreChange(match.id, 's2t1', e.target.value)} className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 outline-none disabled:opacity-30"/>
                      <input type="number" disabled={isPlaceholder} value={s.s2t2 === 0 ? '' : s.s2t2} onChange={e => handleScoreChange(match.id, 's2t2', e.target.value)} className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 outline-none disabled:opacity-30"/>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2 items-center">
                      <input type="number" disabled={isPlaceholder} value={s.s3t1 === 0 ? '' : s.s3t1} onChange={e => handleScoreChange(match.id, 's3t1', e.target.value)} className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 outline-none disabled:opacity-30"/>
                      <input type="number" disabled={isPlaceholder} value={s.s3t2 === 0 ? '' : s.s3t2} onChange={e => handleScoreChange(match.id, 's3t2', e.target.value)} className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 outline-none disabled:opacity-30"/>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <input type="text" value={s.court} onChange={e => handleScoreChange(match.id, 'court', e.target.value)} placeholder="Ct" className="w-16 p-1 text-center border rounded font-black text-slate-600 bg-slate-50 outline-none"/>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${match.status === 'complete' ? 'text-brand-teal' : (isPlaceholder ? 'text-slate-300' : 'text-brand-coral animate-pulse')}`}>
                      {match.status === 'complete' ? 'COMPLETE' : (isPlaceholder ? 'WAITING' : 'PENDING')}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleSave(match)} disabled={saving === match.id} className="bg-brand-black text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-teal transition-colors disabled:opacity-50">
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
  );

  const maxRound = selectedItem?.type === 'bracket' ? Math.max(...matches.map(m => m.bracket_round), 0) : 0;
  const getRoundTitle = (r) => {
    const diff = maxRound - r;
    if (diff === 0) return 'Championship';
    if (diff === 1) return 'Semifinals';
    if (diff === 2) return 'Quarterfinals';
    return `Round ${r}`;
  };

  return (
    <Layout title="2nd Round Score Entry" isAdmin={true}>
      <div className="flex flex-col gap-8 py-4">
        <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white outline-none">
              {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">2nd Round Item</label>
            <select 
              value={selectedItem ? `${selectedItem.id}|${selectedItem.type}` : ''} 
              onChange={e => {
                const [id, type] = e.target.value.split('|');
                setSelectedItem({ id, type });
              }} 
              className="p-2 border rounded-lg text-xs font-bold bg-white outline-none"
            >
              {secondRoundItems.length > 0 ? secondRoundItems.map(item => (
                <option key={`${item.id}|${item.type}`} value={`${item.id}|${item.type}`}>
                  [R{item.round}] {item.name} {item.type === 'pool' ? 'Pool' : 'Bracket'}
                </option>
              )) : <option value="">No 2nd round active</option>}
            </select>
          </div>
        </div>

        {selectedItem?.type === 'bracket' ? (
          Array.from({ length: maxRound }, (_, i) => i + 1).map(r => renderMatchTable(matches.filter(m => m.bracket_round === r), getRoundTitle(r)))
        ) : selectedItem?.type === 'pool' ? (
          renderMatchTable(matches, `${selectedItem.name} Pool Play`)
        ) : (
          <div className="p-20 text-center text-slate-300 font-black uppercase italic tracking-widest">
            Please generate 2nd round seeding first.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BracketScores;
