import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { ageGroups, pools, brackets, matches, teams } from '../../lib/db/schema';
import { eq, asc, and, gt, or } from 'drizzle-orm';
import { validateSetScore, calculateMatchStats } from '../../lib/scoring';
import Layout from '../../components/Layout';

const BracketScores = () => {
  const navigate = useNavigate();
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  const [secondRoundItems, setSecondRoundItems] = useState([]); // List of { id, name, type: 'pool'|'bracket', round }
  const [selectedItem, setSelectedItem] = useState(null); // { id, type }
  
  const [matchesList, setMatchesList] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [allTeams, setAllTeams] = useState([]);
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
    try {
      const tId = localStorage.getItem('tournamentId');
      const data = await db.query.ageGroups.findMany({
        where: eq(ageGroups.tournamentId, tId),
        orderBy: [asc(ageGroups.displayOrder)]
      });
      if (data) {
        setAgeGroupsList(data);
        if (data.length > 0) setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching age groups:', error);
    }
  }

  async function fetchSecondRoundItems() {
    try {
      const poolsData = await db.query.pools.findMany({
        where: and(eq(pools.ageGroupId, selectedGroupId), gt(pools.round, 1)),
        orderBy: [asc(pools.round), asc(pools.displayOrder)]
      });
      
      const bracketsData = await db.query.brackets.findMany({
        where: eq(brackets.ageGroupId, selectedGroupId),
        orderBy: [asc(brackets.round), asc(brackets.displayOrder)]
      });

      const items = [
        ...(poolsData || []).map(p => ({ id: p.id, name: p.name, type: 'pool', round: p.round })),
        ...(bracketsData || []).map(b => ({ id: b.id, name: b.name, type: 'bracket', round: b.round }))
      ];

      setSecondRoundItems(items);
      if (items.length > 0) {
        setSelectedItem({ id: items[0].id, type: items[0].type });
      } else {
        setSelectedItem(null);
        setMatchesList([]);
      }
    } catch (error) {
      console.error('Error fetching second round items:', error);
    }
  }

  async function fetchMatches() {
    try {
      let data;
      if (selectedItem.type === 'pool') {
        data = await db.query.matches.findMany({
          where: eq(matches.poolId, selectedItem.id),
          orderBy: [asc(matches.matchOrder)]
        });
      } else {
        data = await db.query.matches.findMany({
          where: eq(matches.bracketId, selectedItem.id),
          orderBy: [asc(matches.bracketRound), asc(matches.bracketPosition)]
        });
      }

      const matchData = data || [];
      setMatchesList(matchData);
      
      const scoresMap = {};
      matchData.forEach(m => {
        scoresMap[m.id] = {
          s1t1: m.set1Team1 || 0, s1t2: m.set1Team2 || 0,
          s2t1: m.set2Team1 || 0, s2t2: m.set2Team2 || 0,
          s3t1: m.set3Team1 || 0, s3t2: m.set3Team2 || 0,
          court: m.court || '',
          startTime: m.startTime || '',
          team1Id: m.team1Id || '',
          team2Id: m.team2Id || ''
        };
      });
      setMatchScores(scoresMap);
      
      const teamsData = await db.query.teams.findMany({
        where: eq(teams.ageGroupId, selectedGroupId),
        orderBy: [asc(teams.name)]
      });
      setAllTeams(teamsData || []);
      const teamMap = teamsData?.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {}) || {};
      setTeamsMap(teamMap);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  }

  const handleScoreChange = (matchId, field, value) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: (field === 'court' || field === 'startTime' || field === 'team1Id' || field === 'team2Id') ? value : (parseInt(value) || 0)
      }
    }));
  };

  const handleSave = async (match) => {
    const scores = matchScores[match.id];
    setSaving(match.id);

    const isPlaceholder = selectedItem.type === 'bracket' && (!scores.team1Id || !scores.team2Id);
    let winnerId = match.winnerId;
    let status = match.status;

    const hasScores = scores.s1t1 > 0 || scores.s1t2 > 0 || 
                      scores.s2t1 > 0 || scores.s2t2 > 0 || 
                      scores.s3t1 > 0 || scores.s3t2 > 0;

    try {
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
        winnerId = stats.winner === 1 ? (scores.team1Id || match.team1Id) : (scores.team2Id || match.team2Id);
        status = 'complete';
      } else if (!isPlaceholder && !hasScores) {
        status = 'scheduled';
        winnerId = null;
      }

      await db.update(matches)
        .set({
          set1Team1: scores.s1t1, set1Team2: scores.s1t2,
          set2Team1: scores.s2t1, set2Team2: scores.s2t2,
          set3Team1: scores.s3t1, set3Team2: scores.s3t2,
          court: scores.court, 
          startTime: scores.startTime,
          team1Id: scores.team1Id || null,
          team2Id: scores.team2Id || null,
          status: status, 
          winnerId: winnerId
        })
        .where(eq(matches.id, match.id));

      // Auto-Advance for Brackets
      if (selectedItem.type === 'bracket' && status === 'complete' && winnerId) {
        const targetMatches = await db.query.matches.findMany({
          where: or(eq(matches.sourceMatch1Id, match.id), eq(matches.sourceMatch2Id, match.id))
        });

        if (targetMatches?.length > 0) {
          for (const target of targetMatches) {
            const updateData = {};
            if (target.sourceMatch1Id === match.id) updateData.team1Id = winnerId;
            if (target.sourceMatch2Id === match.id) updateData.team2Id = winnerId;
            await db.update(matches).set(updateData).where(eq(matches.id, target.id));
          }
        }
      }
      
      fetchMatches();
    } catch (error) {
      alert(error.message);
    }

    setSaving(null);
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
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Time</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Status</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {matchList.map(match => {
              const s = matchScores[match.id] || { s1t1: 0, s1t2: 0, s2t1: 0, s2t2: 0, s3t1: 0, s3t2: 0, court: '' };
              const t1 = teamsMap[match.team1Id] || (match.sourceMatch1Id ? 'TBD' : 'BYE');
              const t2 = teamsMap[match.team2Id] || (match.sourceMatch2Id ? 'TBD' : 'BYE');
              const isPlaceholder = selectedItem.type === 'bracket' && (!s.team1Id || !s.team2Id);

              return (
                <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-xs font-black text-slate-300">
                    {selectedItem.type === 'pool' ? `M${match.matchOrder}` : `P${match.bracketPosition}`}
                  </td>
                  <td className="p-4">
                    {selectedItem.type === 'bracket' ? (
                      <div className="flex flex-col gap-2">
                        <select 
                          value={s.team1Id} 
                          onChange={e => handleScoreChange(match.id, 'team1Id', e.target.value)}
                          className={`text-xs font-black uppercase italic border border-slate-100 rounded bg-white outline-none p-1 w-full max-w-[140px] ${match.winnerId && match.winnerId === s.team1Id ? 'text-brand-teal' : 'text-slate-800'}`}
                        >
                          <option value="">{match.sourceMatch1Id ? 'TBD' : 'BYE'}</option>
                          {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select 
                          value={s.team2Id} 
                          onChange={e => handleScoreChange(match.id, 'team2Id', e.target.value)}
                          className={`text-xs font-black uppercase italic border border-slate-100 rounded bg-white outline-none p-1 w-full max-w-[140px] ${match.winnerId && match.winnerId === s.team2Id ? 'text-brand-teal' : 'text-slate-800'}`}
                        >
                          <option value="">{match.sourceMatch2Id ? 'TBD' : 'BYE'}</option>
                          {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className={`text-sm font-black uppercase italic tracking-tighter ${match.winnerId === match.team1Id ? 'text-brand-teal' : 'text-slate-800'}`}>{t1}</span>
                        <span className={`text-sm font-black uppercase italic tracking-tighter ${match.winnerId === match.team2Id ? 'text-brand-teal' : 'text-slate-800'}`}>{t2}</span>
                      </div>
                    )}
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
                      <input type="text" value={s.court} onChange={e => handleScoreChange(match.id, 'court', e.target.value)} placeholder="Ct" className="w-12 p-1 text-center border rounded font-black text-slate-600 bg-slate-50 outline-none"/>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <input type="text" value={s.startTime} onChange={e => handleScoreChange(match.id, 'startTime', e.target.value)} placeholder="Time" className="w-20 p-1 text-center border rounded font-black text-slate-600 bg-slate-50 outline-none"/>
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

  const maxRound = selectedItem?.type === 'bracket' ? Math.max(...matchesList.map(m => m.bracketRound), 0) : 0;
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
              {ageGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
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
          Array.from({ length: maxRound }, (_, i) => i + 1).map(r => renderMatchTable(matchesList.filter(m => m.bracketRound === r), getRoundTitle(r)))
        ) : selectedItem?.type === 'pool' ? (
          renderMatchTable(matchesList, `${selectedItem.name} Pool Play`)
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
