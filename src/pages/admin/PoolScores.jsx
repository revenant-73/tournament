import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { ageGroups, pools, matches, teams } from '../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { validateSetScore, calculateMatchStats } from '../../lib/scoring';
import Layout from '../../components/Layout';

const PoolScores = () => {
  const navigate = useNavigate();
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [poolsList, setPoolsList] = useState([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [matchesList, setMatchesList] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [matchScores, setMatchScores] = useState({}); // { matchId: { s1t1, s1t2, ... } }
  const [saving, setSaving] = useState(null); // track which match is saving

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

  async function fetchPools() {
    try {
      const data = await db.query.pools.findMany({
        where: eq(pools.ageGroupId, selectedGroupId),
        orderBy: [asc(pools.displayOrder)]
      });
      if (data) {
        setPoolsList(data);
        if (data.length > 0) setSelectedPoolId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    }
  }

  async function fetchMatches() {
    try {
      const data = await db.query.matches.findMany({
        where: eq(matches.poolId, selectedPoolId),
        orderBy: [asc(matches.matchOrder)]
      });
      const matchData = data || [];
      setMatchesList(matchData);
      
      // Initialize scores
      const scoresMap = {};
      matchData.forEach(m => {
        scoresMap[m.id] = {
          s1t1: m.set1Team1 || 0, s1t2: m.set1Team2 || 0,
          s2t1: m.set2Team1 || 0, s2t2: m.set2Team2 || 0,
          s3t1: m.set3Team1 || 0, s3t2: m.set3Team2 || 0
        };
      });
      setMatchScores(scoresMap);
      
      // Fetch teams for names
      const teamsData = await db.query.teams.findMany({
        where: eq(teams.ageGroupId, selectedGroupId)
      });
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
        [field]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = async (match) => {
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

    // 2. Calculate Stats
    const sets = [
      { team1: scores.s1t1, team2: scores.s1t2 },
      { team1: scores.s2t1, team2: scores.s2t2 }
    ];
    if (needsSet3) sets.push({ team1: scores.s3t1, team2: scores.s3t2 });
    
    const stats = calculateMatchStats(sets);
    const winnerId = stats.winner === 1 ? match.team1Id : match.team2Id;

    // 3. Update Database
    try {
      await db.update(matches)
        .set({
          set1Team1: scores.s1t1, set1Team2: scores.s1t2,
          set2Team1: scores.s2t1, set2Team2: scores.s2t2,
          set3Team1: needsSet3 ? scores.s3t1 : 0, set3Team2: needsSet3 ? scores.s3t2 : 0,
          status: 'complete',
          winnerId: winnerId
        })
        .where(eq(matches.id, match.id));
      
      // Refresh match list to show updated status/winners if needed
      fetchMatches();
    } catch (error) {
      alert(error.message);
    }
    setSaving(null);
  };

  return (
    <Layout title="Pool Score Entry" isAdmin={true}>
      <div className="flex flex-col gap-8 py-4">
        {/* Selectors */}
        <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
              {ageGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Pool</label>
            <select value={selectedPoolId} onChange={e => setSelectedPoolId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
              {poolsList.map(p => <option key={p.id} value={p.id}>{p.round > 1 ? `[R${p.round}] ` : ''}{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Inline Score Entry Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-black text-white">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">#</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">Court</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic">Matchup</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 1</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 2</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Set 3</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest italic text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {matchesList.map(match => {
                const s = matchScores[match.id] || { s1t1: 0, s1t2: 0, s2t1: 0, s2t2: 0, s3t1: 0, s3t2: 0 };
                return (
                  <tr key={match.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-black text-slate-300">M{match.matchOrder}</td>
                    <td className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{match.court || '-'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">{teamsMap[match.team1Id]}</span>
                        <span className="text-sm font-black text-slate-800 uppercase italic tracking-tighter">{teamsMap[match.team2Id]}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center">
                        <input 
                          type="number"
                          value={s.s1t1 === 0 ? '' : s.s1t1}
                          onChange={e => handleScoreChange(match.id, 's1t1', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none"
                        />
                        <input 
                          type="number"
                          value={s.s1t2 === 0 ? '' : s.s1t2}
                          onChange={e => handleScoreChange(match.id, 's1t2', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center">
                        <input 
                          type="number"
                          value={s.s2t1 === 0 ? '' : s.s2t1}
                          onChange={e => handleScoreChange(match.id, 's2t1', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none"
                        />
                        <input 
                          type="number"
                          value={s.s2t2 === 0 ? '' : s.s2t2}
                          onChange={e => handleScoreChange(match.id, 's2t2', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-2 items-center">
                        <input 
                          type="number"
                          value={s.s3t1 === 0 ? '' : s.s3t1}
                          onChange={e => handleScoreChange(match.id, 's3t1', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none"
                        />
                        <input 
                          type="number"
                          value={s.s3t2 === 0 ? '' : s.s3t2}
                          onChange={e => handleScoreChange(match.id, 's3t2', e.target.value)}
                          className="w-12 p-1 text-center border rounded font-black text-brand-teal bg-slate-50 focus:bg-white outline-none"
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${match.status === 'complete' ? 'text-brand-teal' : 'text-brand-coral animate-pulse'}`}>
                        {match.status === 'complete' ? 'COMPLETE' : 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleSave(match)}
                        disabled={saving === match.id}
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

export default PoolScores;
