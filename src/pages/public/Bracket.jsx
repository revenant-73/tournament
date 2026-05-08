import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/db';
import { brackets, matches, teams } from '../../lib/db/schema';
import { eq, asc, and, sql } from 'drizzle-orm';
import Layout from '../../components/Layout';

const BracketScreen = () => {
  const { id } = useParams(); // Now a UUID or 'gold'/'silver' for backward compatibility
  const [bracket, setBracket] = useState(null);
  const [matchesList, setMatchesList] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const selectedAgeGroupId = localStorage.getItem('selectedAgeGroupId');

  useEffect(() => {
    async function fetchBracketData() {
      if (!selectedAgeGroupId) return;

      try {
        // 1. Fetch bracket info
        let bracketData = null;
        if (id.length > 10) { // Assume UUID
          bracketData = await db.query.brackets.findFirst({
            where: eq(brackets.id, id)
          });
        } else { // Handle 'gold'/'silver' legacy
          bracketData = await db.query.brackets.findFirst({
            where: and(
              eq(brackets.ageGroupId, selectedAgeGroupId),
              sql`lower(${brackets.name}) = ${id.toLowerCase()}`
            )
          });
        }

        if (!bracketData) {
          setLoading(false);
          return;
        }
        setBracket(bracketData);

        // 2. Fetch matches
        const matchesData = await db.query.matches.findMany({
          where: eq(matches.bracketId, bracketData.id),
          orderBy: [asc(matches.bracketRound), asc(matches.bracketPosition)]
        });

        setMatchesList(matchesData || []);

        // 3. Fetch teams
        const teamsData = await db.query.teams.findMany({
          where: eq(teams.ageGroupId, selectedAgeGroupId)
        });
        
        const teamMap = teamsData?.reduce((acc, t) => {
          acc[t.id] = t.name;
          return acc;
        }, {}) || {};
        setTeamsMap(teamMap);
      } catch (error) {
        console.error('Error fetching bracket data:', error);
      }

      setLoading(false);
    }

    fetchBracketData();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchBracketData, 30000);

    return () => clearInterval(interval);
  }, [id, selectedAgeGroupId]);

  if (loading) return <Layout title="Bracket"><div className="p-8 text-center">Loading Bracket...</div></Layout>;
  if (!bracket) return <Layout title="Not Found"><div className="p-8 text-center">Bracket not found.</div></Layout>;

  const maxRound = Math.max(...matchesList.map(m => m.bracketRound), 0);
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  const getRoundTitle = (r, total) => {
    const diff = total - r;
    if (diff === 0) return 'Championship';
    if (diff === 1) return 'Semifinals';
    if (diff === 2) return 'Quarterfinals';
    if (diff === 3) return 'Round of 16';
    return `Round ${r}`;
  };

  const isGold = bracket.name.toLowerCase().includes('gold');
  const isSilver = bracket.name.toLowerCase().includes('silver');

  return (
    <Layout title={`${bracket.name.toUpperCase()} Bracket`}>
      <div className="flex flex-col gap-12 py-4">
        <div className="flex justify-center">
          <div className={`px-8 py-2 rounded-full border-2 font-black uppercase tracking-[0.3em] text-[10px] italic ${isGold ? 'bg-amber-50 border-amber-200 text-amber-600' : isSilver ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-teal-50 border-teal-200 text-teal-600'}`}>
            {bracket.name} Tournament
          </div>
        </div>
        {rounds.map(roundNum => {
          const roundMatches = matchesList.filter(m => m.bracketRound === roundNum);
          if (roundMatches.length === 0) return null;

          return (
            <section key={roundNum}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-2 text-center">
                {getRoundTitle(roundNum, maxRound)}
              </h3>
              <div className="flex flex-col gap-6 max-w-sm mx-auto w-full px-4">
                {roundMatches.map(match => (
                  <div key={match.id} className="relative group">
                    <div className={`bg-white rounded-[1.5rem] shadow-sm border overflow-hidden transition-all hover:shadow-md ${isGold ? 'border-amber-100' : isSilver ? 'border-slate-100' : 'border-slate-100'}`}>
                      {(match.court || match.startTime) && (
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-1.5 flex justify-center gap-4">
                          {match.court && (
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                              Court {match.court}
                            </span>
                          )}
                          {match.startTime && (
                            <span className="text-[9px] font-black text-brand-coral uppercase tracking-widest italic">
                              {match.startTime}
                            </span>
                          )}
                        </div>
                      )}
                      <div className={`p-5 flex justify-between items-center border-b border-slate-50 ${match.winnerId && match.winnerId === match.team1Id ? 'bg-teal-50/30' : ''}`}>
                        <span className={`font-black uppercase italic tracking-tighter truncate text-sm ${match.winnerId && match.winnerId === match.team1Id ? 'text-brand-teal' : 'text-slate-400'}`}>
                          {teamsMap[match.team1Id] || (match.sourceMatch1Id ? 'TBD' : 'BYE')}
                        </span>
                        {match.status === 'complete' && match.winnerId && (
                          <span className={`font-black text-xs ${match.winnerId === match.team1Id ? 'text-brand-teal' : 'text-slate-300'}`}>
                            {match.winnerId === match.team1Id ? 'WIN' : 'LOSS'}
                          </span>
                        )}
                      </div>
                      <div className={`p-5 flex justify-between items-center ${match.winnerId && match.winnerId === match.team2Id ? 'bg-teal-50/30' : ''}`}>
                        <span className={`font-black uppercase italic tracking-tighter truncate text-sm ${match.winnerId && match.winnerId === match.team2Id ? 'text-brand-teal' : 'text-slate-400'}`}>
                          {teamsMap[match.team2Id] || (match.sourceMatch2Id ? 'TBD' : 'BYE')}
                        </span>
                        {match.status === 'complete' && match.winnerId && (
                          <span className={`font-black text-xs ${match.winnerId === match.team2Id ? 'text-brand-teal' : 'text-slate-300'}`}>
                            {match.winnerId === match.team2Id ? 'WIN' : 'LOSS'}
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
