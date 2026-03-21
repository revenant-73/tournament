import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { calculateStandings } from '../../lib/scoring';
import Layout from '../../components/Layout';

const Seeding = () => {
  const navigate = useNavigate();
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [rankedTeams, setRankedTeams] = useState([]);
  const [seeding, setSeeding] = useState({ gold: {}, silver: {} });
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

  const assignSeed = (bracket, seed) => {
    if (!selectedTeam) return;
    
    const newSeeding = { ...seeding };
    // Remove team from any other slot first
    Object.keys(newSeeding).forEach(b => {
      Object.keys(newSeeding[b]).forEach(s => {
        if (newSeeding[b][s]?.id === selectedTeam.id) delete newSeeding[b][s];
      });
    });

    newSeeding[bracket][seed] = selectedTeam;
    setSeeding(newSeeding);
    setSelectedTeam(null);
  };

  const handleGenerateBracket = async () => {
    if (Object.keys(seeding.gold).length < 6 || Object.keys(seeding.silver).length < 6) {
      if (!confirm('Both brackets must have 6 teams assigned to generate standard matches. Continue anyway?')) return;
    }

    setSaving(true);
    
    try {
      // 1. Ensure brackets exist for this age group
      let { data: bracketData } = await supabase.from('brackets').select('*').eq('age_group_id', selectedGroupId);
      if (bracketData.length === 0) {
        const { data: newBrackets } = await supabase.from('brackets').insert([
          { age_group_id: selectedGroupId, name: 'Gold', display_order: 1 },
          { age_group_id: selectedGroupId, name: 'Silver', display_order: 2 }
        ]).select();
        bracketData = newBrackets;
      }

      const goldBracket = bracketData.find(b => b.name === 'Gold');
      const silverBracket = bracketData.find(b => b.name === 'Silver');

      // 2. Clear existing bracket matches
      await supabase.from('matches').delete().eq('age_group_id', selectedGroupId).eq('match_type', 'bracket');

      // 3. Generate matches for each bracket
      const generateForBracket = async (bracket, seeds) => {
        if (!bracket) return;
        
        // Spec 5.4: 6-team single elimination
        // Round 1 (QF): Match 1: 3v6, Match 2: 4v5. Seeds 1 & 2 have byes.
        // Round 2 (SF): Match 3: 1 v Winner(M1), Match 4: 2 v Winner(M2)
        // Round 3 (F): Match 5: Winner(M3) v Winner(M4)

        // Insert matches one by one to handle source_match IDs
        const qf1 = await supabase.from('matches').insert([{
          age_group_id: selectedGroupId, match_type: 'bracket', bracket_id: bracket.id,
          bracket_round: 1, bracket_position: 1, team1_id: seeds[3]?.id, team2_id: seeds[6]?.id,
          status: 'scheduled', match_order: 1
        }]).select().single();

        const qf2 = await supabase.from('matches').insert([{
          age_group_id: selectedGroupId, match_type: 'bracket', bracket_id: bracket.id,
          bracket_round: 1, bracket_position: 2, team1_id: seeds[4]?.id, team2_id: seeds[5]?.id,
          status: 'scheduled', match_order: 2
        }]).select().single();

        const sf1 = await supabase.from('matches').insert([{
          age_group_id: selectedGroupId, match_type: 'bracket', bracket_id: bracket.id,
          bracket_round: 2, bracket_position: 1, team1_id: seeds[1]?.id, source_match2_id: qf1.data.id,
          status: 'scheduled', match_order: 3
        }]).select().single();

        const sf2 = await supabase.from('matches').insert([{
          age_group_id: selectedGroupId, match_type: 'bracket', bracket_id: bracket.id,
          bracket_round: 2, bracket_position: 2, team1_id: seeds[2]?.id, source_match2_id: qf2.data.id,
          status: 'scheduled', match_order: 4
        }]).select().single();

        await supabase.from('matches').insert([{
          age_group_id: selectedGroupId, match_type: 'bracket', bracket_id: bracket.id,
          bracket_round: 3, bracket_position: 1, source_match1_id: sf1.data.id, source_match2_id: sf2.data.id,
          status: 'scheduled', match_order: 5
        }]);
      };

      await generateForBracket(goldBracket, seeding.gold);
      await generateForBracket(silverBracket, seeding.silver);

      alert('Brackets generated successfully!');
      navigate('/admin/dashboard');
    } catch (err) {
      alert('Error generating bracket: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Bracket Seeding" isAdmin={true}>
      <div className="flex flex-col gap-8 py-2 lg:grid lg:grid-cols-[400px_1fr] lg:gap-12 lg:items-start">
        <div className="flex flex-col gap-8 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase px-1">Age Group</label>
            <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white">
              {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {/* Ranked Teams List */}
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 px-2">Cross-Pool Rankings</h3>
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

        {/* Brackets Seeding Grid */}
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-2 gap-8">
          {['gold', 'silver'].map(bracket => (
            <div key={bracket} className="flex flex-col gap-4">
              <h4 className={`text-[10px] font-black uppercase tracking-[0.4em] text-center mb-2 ${bracket === 'gold' ? 'text-brand-teal' : 'text-slate-300'}`}>
                {bracket} Bracket
              </h4>
              <div className="flex flex-col gap-3">
                {[1, 2, 3, 4, 5, 6].map(seed => (
                  <button
                    key={seed}
                    onClick={() => assignSeed(bracket, seed)}
                    className="h-16 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden bg-white active:scale-95 group"
                  >
                    {seeding[bracket][seed] ? (
                      <div className="w-full h-full flex items-center px-4 bg-teal-50 text-brand-teal font-black border-l-8 border-brand-teal italic uppercase tracking-tighter text-sm">
                        <span className="opacity-40 mr-3">SEED {seed}</span>
                        <span className="truncate">{seeding[bracket][seed].name}</span>
                      </div>
                    ) : (
                      <span className="opacity-30 group-hover:opacity-60">+ Seed {seed}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerateBracket}
          disabled={saving}
          className="btn btn-primary py-6 shadow-2xl shadow-teal-500/30 uppercase font-black tracking-[0.3em] text-[10px] rounded-[2rem]"
        >
          {saving ? 'Processing...' : '🔥 Finalize Bracket Selection'}
        </button>
        </div>
      </div>
    </Layout>
  );
};

export default Seeding;
