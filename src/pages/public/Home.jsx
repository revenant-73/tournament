import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';

const Home = () => {
  const [tournament, setTournament] = useState(null);
  const [ageGroups, setAgeGroups] = useState([]);
  const [pools, setPools] = useState([]);
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState(
    localStorage.getItem('selectedAgeGroupId') || ''
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch active tournament
      const { data: tournamentData, error: tError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_active', true)
        .single();

      if (tError) {
        console.error('Error fetching tournament:', tError);
        setLoading(false);
        return;
      }
      setTournament(tournamentData);

      // 2. Fetch age groups for that tournament
      const { data: groupsData, error: gError } = await supabase
        .from('age_groups')
        .select('*')
        .eq('tournament_id', tournamentData.id)
        .order('display_order');

      if (gError) {
        console.error('Error fetching age groups:', gError);
      } else {
        setAgeGroups(groupsData);
        // If only one age group exists, select it automatically
        if (groupsData.length === 1 && !selectedAgeGroupId) {
          handleSelectAgeGroup(groupsData[0].id);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedAgeGroupId) {
      fetchPools();
    }
  }, [selectedAgeGroupId]);

  async function fetchPools() {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .eq('age_group_id', selectedAgeGroupId)
      .order('display_order');
    
    if (error) {
      console.error('Error fetching pools:', error);
    } else {
      setPools(data);
    }
  }

  const handleSelectAgeGroup = (id) => {
    setSelectedAgeGroupId(id);
    localStorage.setItem('selectedAgeGroupId', id);
  };

  if (loading) return <div className="p-8 text-center">Loading Tournament...</div>;
  if (!tournament) return <div className="p-8 text-center text-red-500 font-bold uppercase italic">No Active Tournament Found</div>;

  // Age group selection screen
  if (!selectedAgeGroupId && ageGroups.length > 1) {
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
          {ageGroups.map(group => (
            <button
              key={group.id}
              onClick={() => handleSelectAgeGroup(group.id)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-5 rounded-2xl text-lg font-bold transition-all backdrop-blur-md active:scale-95"
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Current Age Group Main Menu
  const currentAgeGroup = ageGroups.find(g => g.id === selectedAgeGroupId);

  return (
    <Layout title={currentAgeGroup?.name || 'Tournament'}>
      <div className="flex flex-col gap-8 py-4">
        {/* Pools Section */}
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Pool Schedules</h3>
          <div className="grid gap-3">
             {pools.length > 0 ? pools.map(pool => (
               <Link 
                key={pool.id} 
                to={`/pool/${pool.id}`}
                className="bg-white border border-slate-100 p-5 rounded-2xl flex justify-between items-center group active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
               >
                 <div className="flex flex-col">
                   <span className="font-black text-slate-800 tracking-tight">{pool.name}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pool.court}</span>
                 </div>
                 <span className="text-brand-teal font-black text-xl group-hover:translate-x-1 transition-transform">→</span>
               </Link>
             )) : (
               <p className="text-sm text-slate-400 italic px-2">No pools scheduled yet.</p>
             )}
          </div>
        </div>

        {/* Brackets Section */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/bracket/gold" className="btn btn-primary text-center py-4 text-sm uppercase tracking-widest">Gold Bracket</Link>
          <Link to="/bracket/silver" className="btn btn-secondary text-center py-4 text-sm uppercase tracking-widest">Silver Bracket</Link>
        </div>

        {/* Info Section */}
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

        {ageGroups.length > 1 && (
          <button 
            onClick={() => setSelectedAgeGroupId('')}
            className="text-[10px] text-center text-slate-400 hover:text-brand-teal mt-4 font-bold uppercase tracking-widest transition-colors"
          >
            ← Change Age Group
          </button>
        )}

        <div className="mt-auto pt-12 text-center">
          <Link to="/admin" className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] hover:text-brand-teal transition-colors">
            Tournament Management
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
