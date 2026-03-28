import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const BracketsTV = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    async function fetchAllBracketsData() {
      const tId = localStorage.getItem('tournamentId');
      if (!tId) {
        setLoading(false);
        return;
      }

      // 1. Fetch all age groups
      const { data: ageGroups } = await supabase
        .from('age_groups')
        .select('*')
        .eq('tournament_id', tId)
        .order('display_order');

      if (!ageGroups) {
        setLoading(false);
        return;
      }

      const ageGroupIds = ageGroups.map(ag => ag.id);

      // 2. Fetch all brackets, teams, and bracket matches
      const [
        { data: allBrackets },
        { data: allTeamsData },
        { data: allMatches }
      ] = await Promise.all([
        supabase.from('brackets').select('*').in('age_group_id', ageGroupIds),
        supabase.from('teams').select('*').in('age_group_id', ageGroupIds),
        supabase.from('matches').select('*').in('age_group_id', ageGroupIds).eq('match_type', 'bracket').order('bracket_round', { ascending: true })
      ]);

      const teamMap = allTeamsData?.reduce((acc, t) => {
        acc[t.id] = t.name;
        return acc;
      }, {}) || {};
      setTeams(teamMap);

      // 3. Organize data
      const organizedData = ageGroups.map(ag => {
        const agBrackets = allBrackets?.filter(b => b.age_group_id === ag.id) || [];
        return {
          ...ag,
          brackets: agBrackets.map(b => ({
            ...b,
            matches: allMatches?.filter(m => m.bracket_id === b.id) || []
          }))
        };
      });

      setData(organizedData);
      setLoading(false);
    }

    fetchAllBracketsData();

    // Subscribe to all matches for realtime
    const subscription = supabase
      .channel('brackets-tv-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, 
        () => fetchAllBracketsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [navigate]);

  if (loading) return <div className="bg-brand-black min-h-screen text-white flex items-center justify-center p-8">Loading TV View...</div>;

  const getRoundTitle = (roundNum) => {
    if (roundNum === 1) return 'QF';
    if (roundNum === 2) return 'SF';
    return 'Final';
  };

  return (
    <div className="bg-brand-black min-h-screen text-white p-4 font-sans overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-brand-coral">
          Elimination Brackets
        </h1>
        <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
          Live Dashboard
        </div>
      </div>

      <div className="flex flex-col gap-8 overflow-hidden h-[calc(100vh-100px)]">
        {data.map(ag => (
          <div key={ag.id} className="flex flex-col gap-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white border-l-4 border-brand-teal pl-3">{ag.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ag.brackets.map(bracket => (
                <div key={bracket.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-coral">{bracket.name} Bracket</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(roundNum => {
                      const roundMatches = bracket.matches.filter(m => m.bracket_round === roundNum);
                      if (roundMatches.length === 0) return <div key={roundNum}></div>;

                      return (
                        <div key={roundNum} className="flex flex-col gap-2">
                          <div className="text-[8px] font-black text-white/20 uppercase tracking-widest text-center border-b border-white/5 pb-1">{getRoundTitle(roundNum)}</div>
                          {roundMatches.map(match => {
                            const t1Name = match.team1_id ? teams[match.team1_id] : (match.bracket_round === 1 ? 'BYE' : 'TBD');
                            const t2Name = match.team2_id ? teams[match.team2_id] : (match.bracket_round === 1 ? 'BYE' : 'TBD');

                            return (
                              <div key={match.id} className="bg-white/5 p-2 rounded-lg border border-white/5 flex flex-col gap-1">
                                {match.court && (
                                  <div className="text-[7px] font-black text-white/20 uppercase tracking-widest text-center border-b border-white/5 mb-1 pb-1">
                                    Court {match.court}
                                  </div>
                                )}
                                <div className={`flex justify-between items-center text-[9px] font-black uppercase italic truncate ${match.winner_id === match.team1_id ? 'text-brand-teal' : 'text-white/40'}`}>
                                  <span className="truncate">{t1Name}</span>
                                  {match.status === 'complete' && <span>{match.winner_id === match.team1_id ? 'W' : 'L'}</span>}
                                </div>
                                <div className={`flex justify-between items-center text-[9px] font-black uppercase italic truncate ${match.winner_id === match.team2_id ? 'text-brand-teal' : 'text-white/40'}`}>
                                  <span className="truncate">{t2Name}</span>
                                  {match.status === 'complete' && <span>{match.winner_id === match.team2_id ? 'W' : 'L'}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketsTV;
