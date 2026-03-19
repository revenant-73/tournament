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
    <Layout title="Admin Dashboard" isAdmin={true}>
      <div className="flex flex-col gap-10 py-6 lg:grid lg:grid-cols-2 lg:gap-16">
        {/* Tournament Info Section */}
        <section className="bg-tvvc-black p-10 rounded-[2.5rem] relative overflow-hidden lg:col-span-2 shadow-2xl shadow-slate-200">
          <div className="absolute top-0 right-0 p-6">
            <button onClick={handleLogout} className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] hover:text-rose-400 transition-colors">
              Logout System
            </button>
          </div>
          <div className="flex flex-col">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter truncate pr-24 leading-none">
              <span className="text-tvvc-teal">T</span>VVC {tournament?.name || 'Tournament'}
            </h2>
            <p className="text-white/30 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-tvvc-teal rounded-full animate-pulse"></span>
              {tournament?.date ? new Date(tournament.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No tournament active'}
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/admin/setup" className="bg-tvvc-teal text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-500/20 hover:bg-tvvc-teal-dark transition-all active:scale-95">
              {tournament ? 'Configuration' : 'Start Setup'}
            </Link>
            <Link to="/results" className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-95">
              Live Results
            </Link>
          </div>
        </section>

        {tournament && (
          <>
            {/* Live Score Section */}
            <div className="flex flex-col gap-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Data Entry</h3>
              <div className="grid gap-4">
                <Link to="/admin/scores/pools" className="bg-white border border-slate-100 p-8 rounded-[2rem] flex justify-between items-center group hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-tvvc-teal uppercase tracking-widest">Pool Play</span>
                    <span className="font-black text-slate-800 text-xl tracking-tight uppercase italic">Score Entry</span>
                  </div>
                  <span className="text-tvvc-teal font-black text-3xl group-hover:translate-x-2 transition-transform">→</span>
                </Link>
                <Link to="/admin/scores/brackets" className="bg-white border border-slate-100 p-8 rounded-[2rem] flex justify-between items-center group hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-tvvc-coral uppercase tracking-widest">Elimination</span>
                    <span className="font-black text-slate-800 text-xl tracking-tight uppercase italic">Bracket Scores</span>
                  </div>
                  <span className="text-tvvc-coral font-black text-3xl group-hover:translate-x-2 transition-transform">→</span>
                </Link>
              </div>
            </div>

            {/* Brackets Section */}
            <div className="flex flex-col gap-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Tournament Flow</h3>
              <Link to="/admin/seeding" className="bg-white border border-slate-100 p-8 rounded-[2rem] flex justify-between items-center group hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 shadow-sm border-l-4 border-l-tvvc-teal">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Post-Pools</span>
                  <span className="font-black text-slate-800 text-xl tracking-tight uppercase italic">Bracket Seeding</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-tvvc-teal uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full">Available</span>
                  <span className="text-tvvc-teal font-black text-3xl group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
