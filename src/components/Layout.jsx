import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';

const Layout = ({ children, title, isAdmin = false }) => {
  const navigate = useNavigate();
  const { tournament } = useTournament();

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col mx-auto shadow-2xl ${isAdmin ? 'max-w-6xl' : 'max-w-md'}`}>
      <header className="bg-brand-black text-white p-6 flex items-center justify-between sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            ←
          </button>
          <Link to="/" className="text-xl font-black italic uppercase tracking-tighter">
            <span className="text-brand-teal">{tournament?.name?.charAt(0) || 'T'}</span>
            {tournament?.name?.slice(1) || 'ournament'}
          </Link>
        </div>
        <h1 className="text-sm font-bold uppercase tracking-widest opacity-80 truncate">{title}</h1>
        <div className="w-10"></div> {/* Spacer for balance */}
      </header>
      
      <main className="flex-1 p-4">
        {children}
      </main>

      <footer className="p-4 border-t border-gray-200 text-center text-xs text-gray-500">
        © 2026 {tournament?.name || 'Tournament Management'}
      </footer>
    </div>
  );
};

export default Layout;
