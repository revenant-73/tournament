import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

const Login = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Fetch active tournament to get admin password
      const { data, error: fetchError } = await supabase
        .from('tournaments')
        .select('id, admin_password')
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        setError('No active tournament found to authenticate.');
        setLoading(false);
        return;
      }

      // 2. Simple password verification
      if (password === data.admin_password) {
        localStorage.setItem('adminToken', 'tvvc-admin-authenticated');
        localStorage.setItem('tournamentId', data.id);
        navigate('/admin/dashboard');
      } else {
        setError('Invalid admin password.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Admin Login">
      <div className="max-w-xs mx-auto py-16 flex flex-col gap-10">
        <div className="text-center">
          <div className="bg-tvvc-black w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center text-white text-4xl mb-6 shadow-2xl shadow-slate-200 border-4 border-white">
            <span className="text-tvvc-teal italic font-black">T</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Director Login</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Tournament Management</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full p-5 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-tvvc-teal/10 focus:border-tvvc-teal focus:outline-none font-bold text-center text-lg transition-all"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold text-center border border-rose-100 uppercase tracking-wide">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-5 text-sm uppercase tracking-[0.2em] font-black disabled:opacity-50 shadow-xl shadow-teal-500/20"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Login;
