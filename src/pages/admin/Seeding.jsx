import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateStandings } from '../../lib/scoring';
import { generateBracketMatches, generatePoolMatches, BRACKET_SIZES } from '../../lib/bracketGenerator';
import Layout from '../../components/Layout';

const FORMATS = [
  { id: '2x6_brackets', name: 'Two 6-Team Brackets (Gold/Silver)', type: 'bracket', brackets: [{ name: 'Gold', size: 6 }, { name: 'Silver', size: 6 }] },
  { id: '3x3_pools', name: 'Three 3-Team Pools (Gold/Silver/Bronze)', type: 'pool', pools: [{ name: 'Gold', size: 3 }, { name: 'Silver', size: 3 }, { name: 'Bronze', size: 3 }] },
  { id: '1x8_bracket', name: 'One 8-Team Bracket', type: 'bracket', brackets: [{ name: 'Championship', size: 8 }] },
  { id: '2x4_brackets', name: 'Two 4-Team Brackets', type: 'bracket', brackets: [{ name: 'Gold', size: 4 }, { name: 'Silver', size: 4 }] },
  { id: 'custom_bracket', name: 'Custom Bracket Size', type: 'bracket_custom' }
];

const Seeding = () => {
  const navigate = useNavigate();
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [rankedTeams, setRankedTeams] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(FORMATS[0]);
  const [customSize, setCustomSize] = useState(8);
  const [seeding, setSeeding] = useState({}); // sectionName -> { seedIndex: team }
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/admin');
    fetchAgeGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) fetchRankings();
  }, [selectedGroupId]);

  async function fetchAgeGroups() {
    const tId = localStorage.getItem('tournamentId');
    const { data } = await supabase.from('age_groups').select('*').eq('tournament_id', tId).order('display_order');
    if (data) {
      setAgeGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    }
  }

  async function fetchRankings() {
    const { data: teams } = await supabase.from('teams').select('*').eq('age_group_id', selectedGroupId);
    const { data: matches } = await supabase.from('matches').select('*').eq('age_group_id', selectedGroupId).eq('match_type', 'pool');
    
    if (teams && matches) {
      const standings = calculateStandings(teams, matches);
      setRankedTeams(standings);
    }
  }

  const assignSeed = (section, seed) => {
    if (!selectedTeam) return;
    
    const newSeeding = { ...seeding };
    if (!newSeeding[section]) newSeeding[section] = {};

    // Remove team from any other slot first
    Object.keys(newSeeding).forEach(sec => {
      Object.keys(newSeeding[sec]).forEach(s => {
        if (newSeeding[sec][s]?.id === selectedTeam.id) delete newSeeding[sec][s];
      });
    });

    newSeeding[section][seed] = selectedTeam;
    setSeeding(newSeeding);
    setSelectedTeam(null);
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      if (selectedFormat.type === 'bracket' || selectedFormat.type === 'bracket_custom') {
        const bracketsToCreate = selectedFormat.type === 'bracket_custom' 
          ? [{ name: 'Custom', size: customSize }] 
          : selectedFormat.brackets;

        // 1. Ensure brackets exist
        await supabase.from('matches').delete().eq('age_group_id', selectedGroupId).eq('match_type', 'bracket');
        
        for (const bInfo of bracketsToCreate) {
          let { data: bracket } = await supabase.from('brackets')
            .select('*').eq('age_group_id', selectedGroupId).eq('name', bInfo.name).single();
          
          if (!bracket) {
            const { data: newB } = await supabase.from('brackets').insert([{
              age_group_id: selectedGroupId, name: bInfo.name, size: bInfo.size, round: 2
            }]).select().single();
            bracket = newB;
          } else {
            await supabase.from('brackets').update({ size: bInfo.size }).eq('id', bracket.id);
          }

          const matchData = generateBracketMatches(selectedGroupId, bracket.id, bInfo.size, seeding[bInfo.name] || {});
          
          // Insert sequentially to link source matches
          const insertedMatches = [];
          for (const m of matchData) {
            const { _meta, ...cleanMatch } = m;
            if (_meta) {
              if (_meta.source1 !== null) cleanMatch.source_match1_id = insertedMatches[_meta.source1].id;
              if (_meta.source2 !== null) cleanMatch.source_match2_id = insertedMatches[_meta.source2].id;
            }
            const { data: newMatch } = await supabase.from('matches').insert([cleanMatch]).select().single();
            insertedMatches.push(newMatch);
          }
        }
      } else if (selectedFormat.type === 'pool') {
        // Handle 2nd round pool play
        await supabase.from('matches').delete().eq('age_group_id', selectedGroupId).eq('match_type', 'pool').gt('match_order', 100); // Rough way to clear R2
        
        for (const pInfo of selectedFormat.pools) {
          const { data: pool } = await supabase.from('pools').insert([{
            age_group_id: selectedGroupId, name: pInfo.name + ' Pool', court: 'TBD', round: 2
          }]).select().single();

          const teams = Object.values(seeding[pInfo.name] || {});
          for (const team of teams) {
            await supabase.from('pool_teams').insert([{ pool_id: pool.id, team_id: team.id }]);
          }

          const matches = generatePoolMatches(selectedGroupId, pool.id, teams, 101); // Match order starts at 101 for R2
          await supabase.from('matches').insert(matches);
        }
      }

      alert('Next round generated successfully!');
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
    <Layout title="Bracket & Pool Seeding" isAdmin={true}>
      <div className="flex flex-col gap-8 py-2 lg:grid lg:grid-cols-[400px_1fr] lg:gap-12 lg:items-start">
        <div className="flex flex-col gap-8 lg:sticky lg:top-24">
          <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
              <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-3 border rounded-xl text-xs font-bold bg-white outline-none">
                {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Next Round Format</label>
              <select 
                value={selectedFormat.id} 
                onChange={e => {
                  setSelectedFormat(FORMATS.find(f => f.id === e.target.value));
                  setSeeding({});
                }} 
                className="p-3 border rounded-xl text-xs font-bold bg-white outline-none"
              >
                {FORMATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {selectedFormat.id === 'custom_bracket' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Bracket Size</label>
                <select value={customSize} onChange={e => setCustomSize(parseInt(e.target.value))} className="p-3 border rounded-xl text-xs font-bold bg-white outline-none">
                  {BRACKET_SIZES.map(s => <option key={s} value={s}>{s} Teams</option>)}
                </select>
              </div>
            )}
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
            {activeSections.map(section => (
              <div key={section.name} className="flex flex-col gap-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-center mb-2 text-brand-teal">
                  {section.name} {selectedFormat.type === 'pool' ? 'Pool' : 'Bracket'}
                </h4>
                <div className="flex flex-col gap-3">
                  {Array.from({ length: section.size }).map((_, i) => {
                    const seed = i + 1;
                    return (
                      <button
                        key={seed}
                        onClick={() => assignSeed(section.name, seed)}
                        className="h-16 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden bg-white active:scale-95 group"
                      >
                        {seeding[section.name]?.[seed] ? (
                          <div className="w-full h-full flex items-center px-4 bg-teal-50 text-brand-teal font-black border-l-8 border-brand-teal italic uppercase tracking-tighter text-sm">
                            <span className="opacity-40 mr-3">SEED {seed}</span>
                            <span className="truncate">{seeding[section.name][seed].name}</span>
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
