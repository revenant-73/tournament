import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { teams } from '../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const TeamList = () => {
  const [teamsList, setTeamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const selectedAgeGroupId = localStorage.getItem('selectedAgeGroupId');

  useEffect(() => {
    async function fetchTeams() {
      if (!selectedAgeGroupId) return;
      
      try {
        const data = await db.query.teams.findMany({
          where: eq(teams.ageGroupId, selectedAgeGroupId),
          with: {
            poolTeams: {
              with: {
                pool: true
              }
            },
            matchesAsTeam1: {
              with: {
                bracket: true
              }
            },
            matchesAsTeam2: {
              with: {
                bracket: true
              }
            }
          },
          orderBy: [asc(teams.name)]
        });

        // Consolidate unique brackets for each team
        const formatted = data.map(team => {
          const bracketMatches = [
            ...(team.matchesAsTeam1 || []),
            ...(team.matchesAsTeam2 || [])
          ].filter(m => m.bracketId);
          
          const uniqueBrackets = Array.from(
            new Map(bracketMatches.map(m => [m.bracketId, m.bracket])).values()
          );
          return { ...team, uniqueBrackets };
        });
        setTeamsList(formatted);
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
      setLoading(false);
    }
    fetchTeams();
  }, [selectedAgeGroupId]);

  if (loading) return <Layout title="Team List"><div className="p-8 text-center">Loading Teams...</div></Layout>;

  return (
    <Layout title="Teams">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {teamsList.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {teamsList.map(team => (
              <div key={team.id} className="p-4 flex flex-col gap-2">
                <span className="font-bold text-gray-900">{team.name}</span>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                  {team.poolTeams?.length > 0 ? (
                    <Link 
                      to={`/pool/${team.poolTeams[0].poolId}`}
                      className="text-brand-blue border border-brand-blue/20 bg-blue-50/50 px-2 py-1 rounded"
                    >
                      {team.poolTeams[0].pool.name} • {team.poolTeams[0].pool.court}
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
