import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveTournament() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('is_active', true)
        .single();
      
      if (data) setTournament(data);
      setLoading(false);
    }
    fetchActiveTournament();
  }, []);

  return (
    <TournamentContext.Provider value={{ tournament, loading }}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = () => useContext(TournamentContext);
