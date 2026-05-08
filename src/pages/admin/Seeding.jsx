import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { ageGroups, teams, matches, brackets, pools, poolTeams } from '../../lib/db/schema';
import { eq, asc, and, gt } from 'drizzle-orm';
import { calculateStandings } from '../../lib/scoring';
import { generateBracketMatches, generatePoolMatches, BRACKET_SIZES } from '../../lib/bracketGenerator';
import Layout from '../../components/Layout';

const Seeding = () => {
  const navigate = useNavigate();
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [rankedTeams, setRankedTeams] = useState([]);
  const [availableBrackets, setAvailableBrackets] = useState([]);
  const [seeding, setSeeding] = useState({}); // bracketId -> { seedIndex: team }
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin');
    fetchAgeGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchRankings();
      fetchBrackets();
    }
  }, [selectedGroupId]);

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

  async function fetchBrackets() {
    try {
      const data = await db.query.brackets.findMany({
        where: eq(brackets.ageGroupId, selectedGroupId),
        orderBy: [asc(brackets.round), asc(brackets.displayOrder)]
      });
      setAvailableBrackets(data || []);
      setSeeding({});
    } catch (error) {
      console.error('Error fetching brackets:', error);
    }
  }

  async function fetchRankings() {
    try {
      const teamsData = await db.query.teams.findMany({
        where: eq(teams.ageGroupId, selectedGroupId)
      });
      const matchesData = await db.query.matches.findMany({
        where: and(
          eq(matches.ageGroupId, selectedGroupId),
          eq(matches.matchType, 'pool')
        )
      });
      
      if (teamsData && matchesData) {
        const standings = calculateStandings(teamsData, matchesData);
        setRankedTeams(standings);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  }

  const assignSeed = (bracketId, seed) => {
    if (!selectedTeam) return;
    
    const newSeeding = { ...seeding };
    if (!newSeeding[bracketId]) newSeeding[bracketId] = {};

    // Remove team from any other slot first
    Object.keys(newSeeding).forEach(bId => {
      Object.keys(newSeeding[bId]).forEach(s => {
        if (newSeeding[bId][s]?.id === selectedTeam.id) delete newSeeding[bId][s];
      });
    });

    newSeeding[bracketId][seed] = selectedTeam;
    setSeeding(newSeeding);
    setSelectedTeam(null);
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      // Delete old bracket matches for this age group
      await db.delete(matches).where(and(
        eq(matches.ageGroupId, selectedGroupId),
        eq(matches.matchType, 'bracket')
      ));

      for (const bracket of availableBrackets) {
        const bracketSeeding = seeding[bracket.id] || {};
        const matchData = generateBracketMatches(selectedGroupId, bracket.id, bracket.size, bracketSeeding);
        
        // Insert sequentially to link source matches
        const insertedMatches = [];
        for (const m of matchData) {
          const { _meta, ...cleanMatch } = m;
          if (_meta) {
            if (_meta.source1 !== null) cleanMatch.sourceMatch1Id = insertedMatches[_meta.source1].id;
            if (_meta.source2 !== null) cleanMatch.sourceMatch2Id = insertedMatches[_meta.source2].id;
          }
          const result = await db.insert(matches).values(cleanMatch).returning();
          insertedMatches.push(result[0]);
        }
      }

      alert('Brackets generated successfully!');
      navigate('/admin/dashboard');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const activeSections = selectedFormat.type === 'pool' 
    ? selectedFormat.pools 
    : (selectedFormat.type === 'bracket_custom' ? [{ name: 'Custom', size: customSize }] : selectedFormat.brackets);

  return (
    <Layout title="2nd Round Seeding" isAdmin={true}>
      <div className="flex flex-col gap-8 py-2 lg:grid lg:grid-cols-[400px_1fr] lg:gap-12 lg:items-start">
        <div className="flex flex-col gap-8 lg:sticky lg:top-24">
          <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
              <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-3 border rounded-xl text-xs font-bold bg-white outline-none">
                {ageGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="p-4 bg-white/50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Configure bracket sizes and names in the <Link to="/admin/setup" className="text-brand-teal underline">Setup area</Link> first.
              </p>
            </div>
          </div>

          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2">Current Standings</h3>
            <div className="flex flex-col gap-3 max-h-60 lg:max-h-[500px] overflow-y-auto no-scrollbar border border-slate-100 p-4 rounded-[2rem] bg-slate-50/50 shadow-inner">
              {rankedTeams.map((team, idx) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-5 rounded-2xl border text-sm flex justify-between items-center transition-all active:scale-95 ${
                    selectedTeam?.id === team.id ? 'bg-brand-teal text-white border-brand-teal shadow-lg shadow-teal-500/20' : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <span className="font-black italic uppercase tracking-tighter truncate pr-4">{idx + 1}. {team.name}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${selectedTeam?.id === team.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                    {team.matchesWon}W {team.setsWon}S
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {availableBrackets.map(bracket => (
              <div key={bracket.id} className="flex flex-col gap-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-center mb-2 text-brand-teal">
                  {bracket.name} Bracket ({bracket.size} teams)
                </h4>
                <div className="flex flex-col gap-3">
                  {Array.from({ length: bracket.size }).map((_, i) => {
                    const seed = i + 1;
                    return (
                      <button
                        key={seed}
                        onClick={() => assignSeed(bracket.id, seed)}
                        className="h-16 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden bg-white active:scale-95 group"
                      >
                        {seeding[bracket.id]?.[seed] ? (
                          <div className="w-full h-full flex items-center px-4 bg-teal-50 text-brand-teal font-black border-l-8 border-brand-teal italic uppercase tracking-tighter text-sm">
                            <span className="opacity-40 mr-3">SEED {seed}</span>
                            <span className="truncate">{seeding[bracket.id][seed].name}</span>
                          </div>
                        ) : (
                          <span className="opacity-30 group-hover:opacity-60">+ Seed {seed}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {availableBrackets.length === 0 && (
              <div className="col-span-2 p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-black uppercase italic tracking-widest text-xs">
                  No brackets configured for this age group.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={saving || Object.keys(seeding).length === 0}
            className="btn btn-primary py-6 shadow-2xl shadow-teal-500/30 uppercase font-black tracking-[0.3em] text-[10px] rounded-[2rem]"
          >
            {saving ? 'Processing...' : '🔥 Generate Next Round'}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Seeding;
