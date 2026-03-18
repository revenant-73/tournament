import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Layout = ({ children, title }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-xl">
      <header className="bg-tvvc-blue text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1 hover:bg-white/10 rounded"
          >
            ←
          </button>
          <Link to="/" className="text-xl font-bold italic uppercase tracking-wider">
            TVVC
          </Link>
        </div>
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        <div className="w-8"></div> {/* Spacer for balance */}
      </header>
      
      <main className="flex-1 p-4">
        {children}
      </main>

      <footer className="p-4 border-t border-gray-200 text-center text-xs text-gray-500">
        © 2026 Tualatin Valley Volleyball Club
      </footer>
    </div>
  );
};

export default Layout;
