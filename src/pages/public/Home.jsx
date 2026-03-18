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
      <div className="min-h-screen bg-tvvc-blue flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold text-white mb-2 italic tracking-tighter uppercase">TVVC</h1>
        <h2 className="text-xl text-white/80 mb-12 font-medium tracking-tight uppercase">Tournament</h2>
        
        <div className="w-full max-w-xs flex flex-col gap-4">
          <p className="text-white/60 text-sm text-center font-bold uppercase tracking-widest mb-2">Select Age Group</p>
          {ageGroups.map(group => (
            <button
              key={group.id}
              onClick={() => handleSelectAgeGroup(group.id)}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-4 rounded-xl text-lg font-semibold transition-all backdrop-blur-sm"
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
      <div className="flex flex-col gap-6 py-4">
        {/* Pools Section */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Pool Schedules</h3>
          <div className="grid gap-3">
             {pools.length > 0 ? pools.map(pool => (
               <Link 
                key={pool.id} 
                to={`/pool/${pool.id}`}
                className="btn bg-white border border-gray-200 text-gray-700 py-4 px-4 flex justify-between items-center group active:bg-gray-50"
               >
                 <span className="font-bold">{pool.name}</span>
                 <span className="text-sm text-gray-400 group-hover:text-tvvc-orange">{pool.court} →</span>
               </Link>
             )) : (
               <p className="text-sm text-gray-400 italic px-2">No pools scheduled yet.</p>
             )}
          </div>
        </div>

        {/* Brackets Section */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/bracket/gold" className="btn btn-primary text-center py-3">Gold Bracket</Link>
          <Link to="/bracket/silver" className="btn btn-secondary text-center py-3">Silver Bracket</Link>
        </div>

        {/* Info Section */}
        <div className="grid gap-3 border-t pt-6">
          <Link to="/teams" className="btn bg-white border border-gray-200 text-gray-700 text-center py-3 flex items-center justify-center gap-2">
            👥 Team List
          </Link>
          <Link to="/info" className="btn bg-white border border-gray-200 text-gray-700 text-center py-3 flex items-center justify-center gap-2">
            ℹ️ Tournament Info
          </Link>
        </div>

        {ageGroups.length > 1 && (
          <button 
            onClick={() => setSelectedAgeGroupId('')}
            className="text-xs text-center text-tvvc-blue mt-8 font-bold uppercase tracking-widest"
          >
            Change Age Group
          </button>
        )}
      </div>
    </Layout>
  );
};

export default Home;
