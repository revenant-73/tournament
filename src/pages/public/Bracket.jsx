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
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          bracket:brackets!inner(name)
        `)
        .eq('age_group_id', selectedAgeGroupId)
        .eq('match_type', 'bracket')
        .ilike('brackets.name', id)
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

          const roundTitle = roundNum === 1 ? 'Quarterfinals' : roundNum === 2 ? 'Semifinals' : 'Final';

          return (
            <section key={roundNum}>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 px-2 text-center">{roundTitle}</h3>
              <div className="flex flex-col gap-6">
                {roundMatches.map(match => (
                  <div key={match.id} className="relative">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      {/* Team 1 */}
                      <div className={`p-3 flex justify-between items-center border-b border-gray-50 ${match.winner_id === match.team1_id ? 'bg-blue-50' : ''}`}>
                        <span className={`font-bold truncate ${match.winner_id === match.team1_id ? 'text-tvvc-blue' : 'text-gray-600'}`}>
                          {teams[match.team1_id] || (match.bracket_round === 1 ? 'BYE' : 'TBD')}
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {match.status === 'complete' ? (match.set1_team1 + match.set2_team1 + (match.set3_team1 || 0) > match.set1_team2 + match.set2_team2 + (match.set3_team2 || 0) ? 'W' : 'L') : ''}
                        </span>
                      </div>
                      {/* Team 2 */}
                      <div className={`p-3 flex justify-between items-center ${match.winner_id === match.team2_id ? 'bg-blue-50' : ''}`}>
                        <span className={`font-bold truncate ${match.winner_id === match.team2_id ? 'text-tvvc-blue' : 'text-gray-600'}`}>
                          {teams[match.team2_id] || (match.bracket_round === 1 ? 'BYE' : 'TBD')}
                        </span>
                        <span className="font-mono text-sm font-bold">
                          {match.status === 'complete' ? (match.set1_team2 + match.set2_team2 + (match.set3_team2 || 0) > match.set1_team1 + match.set2_team1 + (match.set3_team1 || 0) ? 'W' : 'L') : ''}
                        </span>
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
