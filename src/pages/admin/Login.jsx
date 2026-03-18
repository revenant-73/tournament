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
      <div className="max-w-xs mx-auto py-12 flex flex-col gap-8">
        <div className="text-center">
          <div className="bg-tvvc-blue w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl mb-4">
            🔒
          </div>
          <h2 className="text-xl font-bold text-gray-900">Tournament Director</h2>
          <p className="text-sm text-gray-500">Enter password to manage event</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-tvvc-blue focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-4 text-lg disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Login;
