import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/db';
import { tournaments } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const TournamentContext = createContext();

export const TournamentProvider = ({ children }) => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActiveTournament() {
      try {
        if (!db) return;
        const data = await db.query.tournaments.findFirst({
          where: eq(tournaments.isActive, true)
        });
        
        if (data) setTournament(data);
      } catch (error) {
        console.error('Error fetching tournament in context:', error);
      } finally {
        setLoading(false);
      }
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
