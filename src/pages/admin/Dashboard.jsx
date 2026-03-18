import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

const Dashboard = () => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Simple Auth Check
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    // 2. Fetch Active Tournament
    async function fetchTournament() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (data) setTournament(data);
      setLoading(false);
    }
    fetchTournament();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('tournamentId');
    navigate('/admin');
  };

  if (loading) return <Layout title="Admin"><div className="p-8 text-center">Loading Admin...</div></Layout>;

  return (
    <Layout title="Admin Dashboard">
      <div className="flex flex-col gap-8 py-4">
        {/* Tournament Info Section */}
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={handleLogout} className="text-xs text-red-500 font-bold uppercase tracking-widest hover:text-red-600 transition-colors">
              Logout
            </button>
          </div>
          <h2 className="text-2xl font-black text-tvvc-blue uppercase italic truncate pr-16">{tournament?.name || 'Create Tournament'}</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1">
            {tournament?.date ? new Date(tournament.date).toLocaleDateString() : 'No tournament active'}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/admin/setup" className="bg-tvvc-blue text-white px-4 py-2 rounded-lg text-sm font-bold uppercase shadow-sm hover:bg-tvvc-blue/90 transition-colors">
              {tournament ? 'Edit Setup' : 'Start Setup'}
            </Link>
          </div>
        </section>

        {tournament && (
          <>
            {/* Live Score Section */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Live Scores</h3>
              <div className="grid gap-3">
                <Link to="/admin/scores/pools" className="btn bg-white border border-gray-200 text-gray-700 py-4 px-4 flex justify-between items-center group hover:border-tvvc-orange transition-all active:bg-gray-50 rounded-xl shadow-sm">
                  <span className="font-bold flex items-center gap-3">
                    <span className="text-xl">📊</span> Enter Pool Scores
                  </span>
                  <span className="text-sm text-gray-400 group-hover:text-tvvc-orange">→</span>
                </Link>
                <Link to="/admin/scores/brackets" className="btn bg-white border border-gray-200 text-gray-700 py-4 px-4 flex justify-between items-center group hover:border-tvvc-orange transition-all active:bg-gray-50 rounded-xl shadow-sm">
                  <span className="font-bold flex items-center gap-3">
                    <span className="text-xl">🏆</span> Enter Bracket Scores
                  </span>
                  <span className="text-sm text-gray-400 group-hover:text-tvvc-orange">→</span>
                </Link>
              </div>
            </div>

            {/* Brackets Section */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Bracket Seeding</h3>
              <Link to="/admin/seeding" className="btn bg-white border border-gray-200 text-gray-700 py-4 px-4 flex justify-between items-center group hover:border-tvvc-blue transition-all active:bg-gray-50 rounded-xl shadow-sm">
                <span className="font-bold flex items-center gap-3">
                  <span className="text-xl">🌱</span> Seed 12-Team Bracket
                </span>
                <span className="text-sm text-gray-400 group-hover:text-tvvc-blue">→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
