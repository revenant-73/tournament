import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

const BracketScreen = () => {
  const { id } = useParams(); // 'gold' or 'silver'
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const selectedAgeGroupId = localStorage.getItem('selectedAgeGroupId');

  useEffect(() => {
    async function fetchBracketData() {
      if (!selectedAgeGroupId) return;

      // 1. Fetch matches for this bracket
      // First, find the bracket ID if 'id' is 'gold' or 'silver'
      let bracketId = id;
      if (id.toLowerCase() === 'gold' || id.toLowerCase() === 'silver') {
        const { data: bData } = await supabase
          .from('brackets')
          .select('id')
          .eq('age_group_id', selectedAgeGroupId)
          .ilike('name', id)
          .single();
        if (bData) bracketId = bData.id;
      }

      const { data: matchesData } = await supabase
        .from('matches')
        .select(`*`)
        .eq('age_group_id', selectedAgeGroupId)
        .eq('match_type', 'bracket')
        .eq('bracket_id', bracketId)
        .order('bracket_round', { ascending: true })
        .order('bracket_position', { ascending: true });

      setMatches(matchesData || []);

      // 2. Fetch all teams to map IDs to names
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .eq('age_group_id', selectedAgeGroupId);
      
      const teamMap = teamsData?.reduce((acc, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {}) || {};
      setTeams(teamMap);

      setLoading(false);
    }

    fetchBracketData();

    // Subscribe to realtime updates
    const subscription = supabase
      .channel(`bracket-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, 
        () => fetchBracketData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id, selectedAgeGroupId]);

  if (loading) return <Layout title="Bracket"><div className="p-8 text-center">Loading Bracket...</div></Layout>;

  const rounds = [1, 2, 3]; // QF, SF, Final

  return (
    <Layout title={`${id.toUpperCase()} Bracket`}>
      <div className="flex flex-col gap-12 py-4">
        {rounds.map(roundNum => {
          const roundMatches = matches.filter(m => m.bracket_round === roundNum);
          if (roundMatches.length === 0) return null;

          const roundTitle = roundNum === 1 ? 'Quarterfinals' : roundNum === 2 ? 'Semifinals' : 'Championship';

          return (
            <section key={roundNum}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2 text-center">{roundTitle}</h3>
              <div className="flex flex-col gap-6 max-w-sm mx-auto w-full px-4">
                {roundMatches.map(match => (
                  <div key={match.id} className="relative group">
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
                      {/* Team 1 */}
                      <div className={`p-5 flex justify-between items-center border-b border-slate-50 ${match.winner_id === match.team1_id ? 'bg-teal-50/30' : ''}`}>
                        <span className={`font-black uppercase italic tracking-tighter truncate text-sm ${match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-slate-400'}`}>
                          {teams[match.team1_id] || (match.bracket_round === 1 ? 'BYE' : 'TBD')}
                        </span>
                        {match.status === 'complete' && (
                          <span className={`font-black text-xs ${match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-slate-300'}`}>
                            {match.set1_team1 + match.set2_team1 + (match.set3_team1 || 0) > match.set1_team2 + match.set2_team2 + (match.set3_team2 || 0) ? 'WIN' : 'LOSS'}
                          </span>
                        )}
                      </div>
                      {/* Team 2 */}
                      <div className={`p-5 flex justify-between items-center ${match.winner_id === match.team2_id ? 'bg-teal-50/30' : ''}`}>
                        <span className={`font-black uppercase italic tracking-tighter truncate text-sm ${match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-slate-400'}`}>
                          {teams[match.team2_id] || (match.bracket_round === 1 ? 'BYE' : 'TBD')}
                        </span>
                        {match.status === 'complete' && (
                          <span className={`font-black text-xs ${match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-slate-300'}`}>
                            {match.set1_team2 + match.set2_team2 + (match.set3_team2 || 0) > match.set1_team1 + match.set2_team1 + (match.set3_team1 || 0) ? 'WIN' : 'LOSS'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </Layout>
  );
};

export default BracketScreen;
