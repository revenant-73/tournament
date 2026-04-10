import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

const BracketScreen = () => {
  const { id } = useParams(); // Now a UUID or 'gold'/'silver' for backward compatibility
  const [bracket, setBracket] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const selectedAgeGroupId = localStorage.getItem('selectedAgeGroupId');

  useEffect(() => {
    async function fetchBracketData() {
      if (!selectedAgeGroupId) return;

      // 1. Fetch bracket info
      let bracketData = null;
      if (id.length > 10) { // Assume UUID
        const { data } = await supabase.from('brackets').select('*').eq('id', id).single();
        bracketData = data;
      } else { // Handle 'gold'/'silver' legacy
        const { data } = await supabase.from('brackets')
          .select('*').eq('age_group_id', selectedAgeGroupId).ilike('name', id).single();
        bracketData = data;
      }

      if (!bracketData) {
        setLoading(false);
        return;
      }
      setBracket(bracketData);

      // 2. Fetch matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`*`)
        .eq('bracket_id', bracketData.id)
        .order('bracket_round', { ascending: true })
        .order('bracket_position', { ascending: true });

      setMatches(matchesData || []);

      // 3. Fetch teams
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
  if (!bracket) return <Layout title="Not Found"><div className="p-8 text-center">Bracket not found.</div></Layout>;

  const maxRound = Math.max(...matches.map(m => m.bracket_round), 0);
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  const getRoundTitle = (r, total) => {
    const diff = total - r;
    if (diff === 0) return 'Championship';
    if (diff === 1) return 'Semifinals';
    if (diff === 2) return 'Quarterfinals';
    if (diff === 3) return 'Round of 16';
    return `Round ${r}`;
  };

  return (
    <Layout title={`${bracket.name.toUpperCase()} Bracket`}>
      <div className="flex flex-col gap-12 py-4">
        {rounds.map(roundNum => {
          const roundMatches = matches.filter(m => m.bracket_round === roundNum);
          if (roundMatches.length === 0) return null;

          return (
            <section key={roundNum}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2 text-center">
                {getRoundTitle(roundNum, maxRound)}
              </h3>
              <div className="flex flex-col gap-6 max-w-sm mx-auto w-full px-4">
                {roundMatches.map(match => (
                  <div key={match.id} className="relative group">
                    <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
                      {match.court && (
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-1.5 flex justify-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                            Court {match.court}
                          </span>
                        </div>
                      )}
                      <div className={`p-5 flex justify-between items-center border-b border-slate-50 ${match.winner_id && match.winner_id === match.team1_id ? 'bg-teal-50/30' : ''}`}>
                        <span className={`font-black uppercase italic tracking-tighter truncate text-sm ${match.winner_id && match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-slate-400'}`}>
                          {teams[match.team1_id] || (roundNum === 1 ? (match.team2_id ? 'TBD' : 'BYE') : 'TBD')}
                        </span>
                        {match.status === 'complete' && match.winner_id && (
                          <span className={`font-black text-xs ${match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-slate-300'}`}>
                            {match.winner_id === match.team1_id ? 'WIN' : 'LOSS'}
                          </span>
                        )}
                      </div>
                      <div className={`p-5 flex justify-between items-center ${match.winner_id && match.winner_id === match.team2_id ? 'bg-teal-50/30' : ''}`}>
                        <span className={`font-black uppercase italic tracking-tighter truncate text-sm ${match.winner_id && match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-slate-400'}`}>
                          {teams[match.team2_id] || (roundNum === 1 ? (match.team1_id ? 'TBD' : 'BYE') : 'TBD')}
                        </span>
                        {match.status === 'complete' && match.winner_id && (
                          <span className={`font-black text-xs ${match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-slate-300'}`}>
                            {match.winner_id === match.team2_id ? 'WIN' : 'LOSS'}
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
