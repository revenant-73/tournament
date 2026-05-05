import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { tournaments } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import Layout from '../../components/Layout';

const InfoScreen = () => {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const data = await db.query.tournaments.findFirst({
          where: eq(tournaments.isActive, true)
        });
        setTournament(data);
      } catch (error) {
        console.error('Error fetching info:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, []);

  if (loading) return <Layout title="Info"><div className="p-8 text-center">Loading Info...</div></Layout>;
  if (!tournament) return <Layout title="Info"><div className="p-8 text-center">No Info Available</div></Layout>;

  return (
    <Layout title="Tournament Info">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-black text-brand-blue uppercase italic">{tournament.name}</h2>
          <p className="text-brand-orange font-bold uppercase tracking-widest text-sm mt-1">
            {new Date(tournament.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {tournament.location && (
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Venue</h3>
            <p className="font-semibold text-gray-800">{tournament.location}</p>
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Rules & Format</h3>
          <div className="whitespace-pre-wrap text-gray-600 leading-relaxed text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
            {tournament.info || 'No details provided.'}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-50 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Tournament Director: Admin</p>
        </div>
      </div>
    </Layout>
  );
};

export default InfoScreen;
