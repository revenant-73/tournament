import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { tournaments, ageGroups, pools, brackets } from '../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const Home = () => {
  const [tournament, setTournament] = useState(null);
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [poolsList, setPoolsList] = useState([]);
  const [bracketsList, setBracketsList] = useState([]);
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState(
    localStorage.getItem('selectedAgeGroupId') || ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      console.log("Fetching tournament data...");
      try {
        if (!db) {
          throw new Error("Database client not initialized");
        }
        const tournamentData = await db.query.tournaments.findFirst({
          where: eq(tournaments.isActive, true)
        });

        if (!tournamentData) {
          console.log("No active tournament found");
          setLoading(false);
          return;
        }
        setTournament(tournamentData);

        const groupsData = await db.query.ageGroups.findMany({
          where: eq(ageGroups.tournamentId, tournamentData.id),
          orderBy: [asc(ageGroups.displayOrder)]
        });

        if (groupsData) {
          setAgeGroupsList(groupsData);
          if (groupsData.length === 1 && !selectedAgeGroupId) {
            handleSelectAgeGroup(groupsData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAgeGroupId) {
      fetchNextRoundData();
    }
  }, [selectedAgeGroupId]);

  async function fetchNextRoundData() {
    try {
      const pData = await db.query.pools.findMany({
        where: eq(pools.ageGroupId, selectedAgeGroupId),
        orderBy: [asc(pools.round), asc(pools.displayOrder)]
      });
      
      const bData = await db.query.brackets.findMany({
        where: eq(brackets.ageGroupId, selectedAgeGroupId),
        orderBy: [asc(brackets.round), asc(brackets.displayOrder)]
      });

      setPoolsList(pData || []);
      setBracketsList(bData || []);
    } catch (err) {
      console.error('Error fetching round data:', err);
    }
  }

  const handleSelectAgeGroup = (id) => {
    setSelectedAgeGroupId(id);
    localStorage.setItem('selectedAgeGroupId', id);
  };

  if (loading) return <div className="p-8 text-center flex flex-col items-center gap-4">
    <div className="w-8 h-8 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
    <span className="font-bold uppercase tracking-widest text-slate-400">Loading Tournament...</span>
  </div>;

  if (error) return <div className="p-8 text-center text-red-500 font-bold uppercase italic flex flex-col gap-2">
    <span>Error connecting to database</span>
    <span className="text-[10px] opacity-60 font-mono">{error}</span>
  </div>;

  if (!tournament) return <div className="p-8 text-center text-red-500 font-bold uppercase italic">No Active Tournament Found</div>;

  if (!selectedAgeGroupId && ageGroupsList.length > 1) {
    return (
      <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center p-8">
        <div className="mb-16 text-center">
          <h1 className="text-6xl font-black text-white mb-2 italic tracking-tighter uppercase leading-none">
            <span className="text-brand-teal">{tournament.name.charAt(0)}</span>{tournament.name.slice(1)}
          </h1>
          <p className="text-xs text-white/40 font-bold uppercase tracking-[0.3em] ml-1">Tournament Management</p>
        </div>
        <div className="w-full max-w-xs flex flex-col gap-4">
          <p className="text-white/30 text-[10px] text-center font-bold uppercase tracking-widest mb-2">Select Age Group</p>
          {ageGroupsList.map(group => (
            <button key={group.id} onClick={() => handleSelectAgeGroup(group.id)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-5 rounded-2xl text-lg font-bold transition-all backdrop-blur-md active:scale-95">
              {group.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentAgeGroup = ageGroupsList.find(g => g.id === selectedAgeGroupId);
  const rounds = Array.from(new Set([...poolsList.map(p => p.round), ...bracketsList.map(b => b.round)])).sort();

  return (
    <Layout title={currentAgeGroup?.name || 'Tournament'}>
      <div className="flex flex-col gap-10 py-4">
        {rounds.map(roundNum => (
          <div key={roundNum} className="flex flex-col gap-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 px-2 border-l-4 border-brand-teal pl-3">
              Round {roundNum}: {roundNum === 1 ? 'Preliminary Play' : 'Championship Rounds'}
            </h3>
            
            <div className="grid gap-3">
              {poolsList.filter(p => p.round === roundNum).map(pool => (
                <Link key={pool.id} to={`/pool/${pool.id}`} className="bg-white border border-slate-100 p-5 rounded-2xl flex justify-between items-center group active:scale-[0.98] transition-all shadow-sm hover:shadow-md">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-800 tracking-tight uppercase italic">{pool.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Court {pool.court}</span>
                  </div>
                  <span className="text-brand-teal font-black text-xl group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              ))}

              {bracketsList.filter(b => b.round === roundNum).map(bracket => (
                <Link key={bracket.id} to={`/bracket/${bracket.id}`} className="bg-brand-teal text-white p-5 rounded-2xl flex justify-between items-center group active:scale-[0.98] transition-all shadow-lg shadow-teal-500/20">
                  <div className="flex flex-col">
                    <span className="font-black tracking-tight uppercase italic">{bracket.name} Bracket</span>
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Single Elimination</span>
                  </div>
                  <span className="font-black text-xl group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="grid gap-3 border-t border-slate-100 pt-8">
          <Link to="/teams" className="bg-white border border-slate-100 text-slate-600 font-bold p-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-wider">
            <span>👥</span> Team List
          </Link>
          <Link to="/info" className="bg-white border border-slate-100 text-slate-600 font-bold p-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-wider">
            <span>ℹ️</span> Tournament Info
          </Link>
          <Link to="/results" className="bg-white border border-slate-100 text-slate-600 font-bold p-4 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm uppercase tracking-wider">
            <span>🏆</span> Final Results
          </Link>
        </div>

        {ageGroupsList.length > 1 && (
          <button onClick={() => setSelectedAgeGroupId('')} className="text-[10px] text-center text-slate-400 hover:text-brand-teal mt-4 font-bold uppercase tracking-widest transition-colors">
            ← Change Age Group
          </button>
        )}
      </div>
    </Layout>
  );
};

export default Home;
