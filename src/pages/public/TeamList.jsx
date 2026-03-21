import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const TeamList = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedAgeGroupId = localStorage.getItem('selectedAgeGroupId');

  useEffect(() => {
    async function fetchTeams() {
      if (!selectedAgeGroupId) return;
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          pool_teams (
            pool_id,
            pools (
              name,
              court
            )
          ),
          m1:matches!team1_id(bracket_id, brackets(name)),
          m2:matches!team2_id(bracket_id, brackets(name))
        `)
        .eq('age_group_id', selectedAgeGroupId)
        .order('name');

      if (error) {
        console.error('Error fetching teams:', error);
      } else {
        // Consolidate unique brackets for each team
        const formatted = data.map(team => {
          const bracketMatches = [...(team.m1 || []), ...(team.m2 || [])].filter(m => m.bracket_id);
          const uniqueBrackets = Array.from(new Map(bracketMatches.map(m => [m.bracket_id, m.brackets])).values());
          return { ...team, uniqueBrackets };
        });
        setTeams(formatted);
      }
      setLoading(false);
    }
    fetchTeams();
  }, [selectedAgeGroupId]);

  if (loading) return <Layout title="Team List"><div className="p-8 text-center">Loading Teams...</div></Layout>;

  return (
    <Layout title="Teams">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {teams.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {teams.map(team => (
              <div key={team.id} className="p-4 flex flex-col gap-2">
                <span className="font-bold text-gray-900">{team.name}</span>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                  {team.pool_teams?.length > 0 ? (
                    <Link 
                      to={`/pool/${team.pool_teams[0].pool_id}`}
                      className="text-brand-blue border border-brand-blue/20 bg-blue-50/50 px-2 py-1 rounded"
                    >
                      {team.pool_teams[0].pools.name} • {team.pool_teams[0].pools.court}
                    </Link>
                  ) : (
                    <span className="text-gray-400 border border-gray-100 bg-gray-50/50 px-2 py-1 rounded italic">Not assigned to pool</span>
                  )}
                  
                  {team.uniqueBrackets?.map(bracket => (
                    <Link 
                      key={bracket.id}
                      to={`/bracket/${bracket.name.toLowerCase()}`}
                      className="text-brand-orange border border-brand-orange/20 bg-orange-50/50 px-2 py-1 rounded"
                    >
                      {bracket.name} Bracket
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400 italic">No teams registered yet.</div>
        )}
      </div>
    </Layout>
  );
};

export default TeamList;
