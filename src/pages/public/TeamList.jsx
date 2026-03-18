import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
            pools (
              name,
              court
            )
          )
        `)
        .eq('age_group_id', selectedAgeGroupId)
        .order('name');

      if (error) {
        console.error('Error fetching teams:', error);
      } else {
        setTeams(data);
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
              <div key={team.id} className="p-4 flex flex-col gap-1">
                <span className="font-bold text-gray-900">{team.name}</span>
                <div className="flex gap-2 text-xs">
                  {team.pool_teams?.length > 0 ? (
                    <span className="text-tvvc-blue font-semibold uppercase">
                      {team.pool_teams[0].pools.name} • {team.pool_teams[0].pools.court}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Not assigned to pool</span>
                  )}
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
