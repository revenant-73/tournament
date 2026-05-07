import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { tournaments, ageGroups, teams, pools, poolTeams, matches } from '../../lib/db/schema';
import { eq, asc, and, sql } from 'drizzle-orm';
import Layout from '../../components/Layout';

const Setup = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tournament');
  const [tournament, setTournament] = useState({
    name: '',
    date: '',
    location: '',
    info: '',
    adminPassword: '',
    isActive: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    async function fetchTournament() {
      try {
        const data = await db.query.tournaments.findFirst({
          where: eq(tournaments.isActive, true)
        });
        
        if (data) setTournament(data);
      } catch (error) {
        console.error('Error fetching tournament:', error);
      }
      setLoading(false);
    }
    fetchTournament();
  }, [navigate]);

  const handleSaveTournament = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (tournament.id) {
        await db.update(tournaments)
          .set({
            name: tournament.name,
            date: tournament.date,
            location: tournament.location,
            info: tournament.info,
            adminPassword: tournament.adminPassword,
            isActive: tournament.isActive
          })
          .where(eq(tournaments.id, tournament.id));
        alert('Tournament saved successfully!');
      } else {
        const result = await db.insert(tournaments)
          .values({
            name: tournament.name,
            date: tournament.date,
            location: tournament.location,
            info: tournament.info,
            adminPassword: tournament.adminPassword,
            isActive: tournament.isActive
          })
          .returning();
        
        if (result && result[0]) {
          setTournament(result[0]);
          localStorage.setItem('tournamentId', result[0].id);
          alert('Tournament created successfully!');
        }
      }
    } catch (error) {
      alert('Error saving tournament: ' + error.message);
    }
    setSaving(false);
  };

  if (loading) return <Layout title="Setup" isAdmin={true}><div className="p-8 text-center">Loading Setup...</div></Layout>;

  return (
    <Layout title="Tournament Setup" isAdmin={true}>
      <div className="flex flex-col gap-6 py-2">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
          {['tournament', 'age groups', 'teams', 'pools'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab ? 'border-brand-teal text-brand-teal' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="py-6">
          {activeTab === 'tournament' && (
            <form onSubmit={handleSaveTournament} className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tournament Name</label>
                <input
                  type="text"
                  required
                  value={tournament.name}
                  onChange={e => setTournament({...tournament, name: e.target.value})}
                  className="p-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal outline-none font-bold text-slate-800 transition-all shadow-sm"
                  placeholder="e.g. May 9-10 Shindig"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label>
                  <input
                    type="date"
                    required
                    value={tournament.date}
                    onChange={e => setTournament({...tournament, date: e.target.value})}
                    className="p-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal outline-none font-bold text-slate-800 transition-all shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Admin Password</label>
                  <input
                    type="text"
                    required
                    value={tournament.adminPassword}
                    onChange={e => setTournament({...tournament, adminPassword: e.target.value})}
                    className="p-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal outline-none font-bold text-slate-800 transition-all shadow-sm"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Location</label>
                <input
                  type="text"
                  value={tournament.location || ''}
                  onChange={e => setTournament({...tournament, location: e.target.value})}
                  className="p-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal outline-none font-bold text-slate-800 transition-all shadow-sm"
                  placeholder="Venue name or address"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rules & Info</label>
                <textarea
                  rows="6"
                  value={tournament.info || ''}
                  onChange={e => setTournament({...tournament, info: e.target.value})}
                  className="p-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal outline-none text-sm font-medium leading-relaxed text-slate-700 transition-all shadow-sm"
                  placeholder="Add tournament details, rules, contact info..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary py-5 mt-4 shadow-2xl shadow-teal-500/20 text-sm uppercase tracking-[0.2em]"
              >
                {saving ? 'Saving...' : 'Save Tournament Config'}
              </button>
            </form>
          )}

          {activeTab !== 'tournament' && !tournament.id && (
            <div className="p-12 text-center text-gray-400">
              <span className="text-4xl block mb-4">☝️</span>
              Please save the tournament configuration first.
            </div>
          )}

          {activeTab === 'age groups' && tournament.id && (
            <AgeGroupsManager tournamentId={tournament.id} />
          )}

          {activeTab === 'teams' && tournament.id && (
            <TeamsManager tournamentId={tournament.id} />
          )}

          {activeTab === 'pools' && tournament.id && (
            <PoolsManager tournamentId={tournament.id} />
          )}
        </div>
      </div>
    </Layout>
  );
};

// Sub-components for better management
const AgeGroupsManager = ({ tournamentId }) => {
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchAgeGroups();
  }, [tournamentId]);

  async function fetchAgeGroups() {
    try {
      const data = await db.query.ageGroups.findMany({
        where: eq(ageGroups.tournamentId, tournamentId),
        orderBy: [asc(ageGroups.displayOrder)]
      });
      if (data) setAgeGroupsList(data);
    } catch (error) {
      console.error('Error fetching age groups:', error);
    }
  }

  const handleAdd = async () => {
    if (!newName) return;
    try {
      await db.insert(ageGroups).values({
        tournamentId: tournamentId,
        name: newName,
        displayOrder: ageGroupsList.length
      });
      setNewName('');
      fetchAgeGroups();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will delete all teams and pools in this group.')) return;
    try {
      await db.delete(ageGroups).where(eq(ageGroups.id, id));
      fetchAgeGroups();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <input 
          type="text" 
          value={newName} 
          onChange={e => setNewName(e.target.value)}
          placeholder="New Age Group (e.g. Open)"
          className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal font-bold text-slate-800 transition-all shadow-sm"
        />
        <button onClick={handleAdd} className="btn btn-primary px-8 text-sm uppercase tracking-widest">Add</button>
      </div>
      <div className="flex flex-col gap-3">
        {ageGroupsList.map(group => (
          <div key={group.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
            <span className="font-black text-slate-800 tracking-tight">{group.name}</span>
            <button onClick={() => handleDelete(group.id)} className="text-rose-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeamsManager = ({ tournamentId }) => {
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [teamsList, setTeamsList] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    fetchAgeGroups();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedGroupId) fetchTeams();
  }, [selectedGroupId]);

  async function fetchAgeGroups() {
    try {
      const data = await db.query.ageGroups.findMany({
        where: eq(ageGroups.tournamentId, tournamentId),
        orderBy: [asc(ageGroups.displayOrder)]
      });
      if (data) {
        setAgeGroupsList(data);
        if (data.length > 0) setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching age groups:', error);
    }
  }

  async function fetchTeams() {
    try {
      const data = await db.query.teams.findMany({
        where: eq(teams.ageGroupId, selectedGroupId),
        orderBy: [asc(teams.name)]
      });
      if (data) setTeamsList(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }

  const handleAddTeam = async () => {
    if (!newTeamName || !selectedGroupId) return;
    try {
      await db.insert(teams).values({
        ageGroupId: selectedGroupId,
        name: newTeamName
      });
      setNewTeamName('');
      fetchTeams();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteTeam = async (id) => {
    try {
      await db.delete(teams).where(eq(teams.id, id));
      fetchTeams();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Age Group</label>
        <select 
          value={selectedGroupId} 
          onChange={e => setSelectedGroupId(e.target.value)}
          className="p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal font-bold text-slate-800 transition-all shadow-sm cursor-pointer"
        >
          {ageGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="flex gap-3">
        <input 
          type="text" 
          value={newTeamName} 
          onChange={e => setNewTeamName(e.target.value)}
          placeholder="New Team Name"
          className="flex-1 p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal font-bold text-slate-800 transition-all shadow-sm"
        />
        <button onClick={handleAddTeam} className="btn btn-primary px-8 text-sm uppercase tracking-widest">Add</button>
      </div>

      <div className="flex flex-col gap-2">
        {teamsList.map(team => (
          <div key={team.id} className="bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
            <span className="font-bold text-slate-700 text-sm">{team.name}</span>
            <button onClick={() => handleDeleteTeam(team.id)} className="text-rose-400 hover:text-rose-600 text-lg px-2 group-hover:scale-125 transition-transform">×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const PoolsManager = ({ tournamentId }) => {
  const [ageGroupsList, setAgeGroupsList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [poolsList, setPoolsList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [poolTeamsMap, setPoolTeamsMap] = useState({}); // poolId -> array of team objects
  const [newPool, setNewPool] = useState({ name: '', court: '' });

  useEffect(() => {
    fetchAgeGroups();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchPools();
      fetchTeams();
    }
  }, [selectedGroupId]);

  async function fetchAgeGroups() {
    try {
      const data = await db.query.ageGroups.findMany({
        where: eq(ageGroups.tournamentId, tournamentId),
        orderBy: [asc(ageGroups.displayOrder)]
      });
      if (data) {
        setAgeGroupsList(data);
        if (data.length > 0) setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching age groups:', error);
    }
  }

  async function fetchPools() {
    try {
      const data = await db.query.pools.findMany({
        where: eq(pools.ageGroupId, selectedGroupId),
        with: {
          poolTeams: {
            with: {
              team: true
            }
          }
        },
        orderBy: [asc(pools.displayOrder)]
      });
      if (data) {
        setPoolsList(data);
        const ptData = {};
        data.forEach(p => {
          ptData[p.id] = p.poolTeams.map(pt => pt.team);
        });
        setPoolTeamsMap(ptData);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    }
  }

  async function fetchTeams() {
    try {
      const data = await db.query.teams.findMany({
        where: eq(teams.ageGroupId, selectedGroupId),
        orderBy: [asc(teams.name)]
      });
      if (data) setTeamsList(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }

  const handleAddPool = async () => {
    if (!newPool.name || !newPool.court || !selectedGroupId) return;
    try {
      await db.insert(pools).values({ 
        ageGroupId: selectedGroupId, 
        name: newPool.name, 
        court: newPool.court, 
        displayOrder: poolsList.length 
      });
      setNewPool({ name: '', court: '' });
      fetchPools();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeletePool = async (id) => {
    if (!confirm('Delete pool and all its matches?')) return;
    try {
      await db.delete(pools).where(eq(pools.id, id));
      fetchPools();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAssignTeam = async (poolId, teamId) => {
    if (!teamId) return;
    try {
      await db.insert(poolTeams).values({ poolId, teamId });
      fetchPools();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemoveTeam = async (poolId, teamId) => {
    try {
      await db.delete(poolTeams).where(and(eq(poolTeams.poolId, poolId), eq(poolTeams.teamId, teamId)));
      fetchPools();
    } catch (error) {
      alert(error.message);
    }
  };

  const generateMatches = async (poolId) => {
    const teamsInPool = poolTeamsMap[poolId] || [];
    if (teamsInPool.length < 2) {
      alert('Need at least 2 teams to generate matches');
      return;
    }

    let matchesToCreate = [];
    if (teamsInPool.length === 3) {
      const schedule = [
        { t1: 0, t2: 2, ref: 1 }, // 1v3 Ref 2
        { t1: 1, t2: 2, ref: 0 }, // 2v3 Ref 1
        { t1: 0, t2: 1, ref: 2 }  // 1v2 Ref 3
      ];
      matchesToCreate = schedule.map((m, idx) => ({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id: teamsInPool[m.t1].id,
        team2Id: teamsInPool[m.t2].id,
        refTeamId: teamsInPool[m.ref].id,
        matchOrder: idx + 1,
        status: 'scheduled'
      }));
    } else if (teamsInPool.length === 4) {
      const schedule = [
        { t1: 0, t2: 2, ref: 3 }, // 1v3 Ref 4
        { t1: 1, t2: 3, ref: 2 }, // 2v4 Ref 3
        { t1: 0, t2: 3, ref: 1 }, // 1v4 Ref 2
        { t1: 1, t2: 2, ref: 3 }, // 2v3 Ref 4
        { t1: 2, t2: 3, ref: 0 }, // 3v4 Ref 1
        { t1: 0, t2: 1, ref: 2 }  // 1v2 Ref 3
      ];
      matchesToCreate = schedule.map((m, idx) => ({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id: teamsInPool[m.t1].id,
        team2Id: teamsInPool[m.t2].id,
        refTeamId: teamsInPool[m.ref].id,
        matchOrder: idx + 1,
        status: 'scheduled'
      }));
    } else if (teamsInPool.length === 5) {
      const schedule = [
        // Wave 1
        { t1: 0, t2: 3, ref: 3, court: '1' }, // 1v4 Ref 4
        { t1: 1, t2: 4, ref: 4, court: '2' }, // 2v5 Ref 5
        // Wave 2
        { t1: 0, t2: 4, ref: 2, court: '1' }, // 1v5 Ref 3
        { t1: 1, t2: 2, ref: 1, court: '2' }, // 2v3 Ref 2
        // Wave 3
        { t1: 2, t2: 4, ref: 1, court: '1' }, // 3v5 Ref 2
        { t1: 1, t2: 3, ref: 0, court: '2' }, // 2v4 Ref 1
        // Wave 4
        { t1: 0, t2: 2, ref: 0, court: '1' }, // 1v3 Ref 1
        { t1: 3, t2: 4, ref: 3, court: '2' }, // 4v5 Ref 4
        // Wave 5
        { t1: 0, t2: 1, ref: 4, court: '1' }, // 1v2 Ref 5
        { t1: 2, t2: 3, ref: 2, court: '2' }  // 3v4 Ref 3
      ];
      matchesToCreate = schedule.map((m, idx) => ({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id: teamsInPool[m.t1].id,
        team2Id: teamsInPool[m.t2].id,
        refTeamId: teamsInPool[m.ref].id,
        matchOrder: idx + 1,
        court: `C${m.court}`,
        status: 'scheduled'
      }));
    } else {
      // Basic Round Robin for other sizes
      for (let i = 0; i < teamsInPool.length; i++) {
        for (let j = i + 1; j < teamsInPool.length; j++) {
          matchesToCreate.push({
            ageGroupId: selectedGroupId,
            poolId: poolId,
            matchType: 'pool',
            team1Id: teamsInPool[i].id,
            team2Id: teamsInPool[j].id,
            matchOrder: matchesToCreate.length + 1,
            status: 'scheduled'
          });
        }
      }
    }

    if (confirm(`Generate ${matchesToCreate.length} matches for this pool? This will delete existing matches.`)) {
      try {
        await db.delete(matches).where(eq(matches.poolId, poolId));
        await db.insert(matches).values(matchesToCreate);
        alert('Matches generated!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const unassignedTeams = teamsList.filter(t => 
    !Object.values(poolTeamsMap).flat().some(pt => pt.id === t.id)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Age Group</label>
        <select 
          value={selectedGroupId} 
          onChange={e => setSelectedGroupId(e.target.value)}
          className="p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal font-bold text-slate-800 transition-all shadow-sm cursor-pointer"
        >
          {ageGroupsList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Add Pool Form */}
      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-4 shadow-sm">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Create New Pool</h4>
        <div className="grid grid-cols-2 gap-4">
          <input 
            type="text" 
            placeholder="Pool Name (A, B...)" 
            value={newPool.name}
            onChange={e => setNewPool({...newPool, name: e.target.value})}
            className="p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal font-bold text-slate-800 transition-all"
          />
          <input 
            type="text" 
            placeholder="Court (1, 2...)" 
            value={newPool.court}
            onChange={e => setNewPool({...newPool, court: e.target.value})}
            className="p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal font-bold text-slate-800 transition-all text-center uppercase"
          />
        </div>
        <button onClick={handleAddPool} className="btn btn-primary py-4 text-[10px] uppercase tracking-[0.2em] font-black">
          Create Pool Structure
        </button>
      </div>

      {/* Pools List */}
      <div className="flex flex-col gap-8">
        {poolsList.map(pool => (
          <div key={pool.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
            <div className="bg-slate-50 p-5 flex justify-between items-center border-b border-slate-100">
              <div className="flex flex-col">
                <span className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{pool.name}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pool.court}</span>
              </div>
              <button onClick={() => handleDeletePool(pool.id)} className="text-rose-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-rose-50 rounded-full transition-colors">Delete</button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              {/* Teams in Pool */}
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {poolTeamsMap[pool.id]?.length > 0 ? poolTeamsMap[pool.id]?.map(team => (
                  <div key={team.id} className="bg-teal-50 text-brand-teal px-4 py-2 rounded-full text-[10px] font-black border border-teal-100 flex items-center gap-3 uppercase tracking-wider">
                    {team.name}
                    <button onClick={() => handleRemoveTeam(pool.id, team.id)} className="text-teal-300 hover:text-rose-500 font-black text-sm">×</button>
                  </div>
                )) : (
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest px-1 italic">No teams assigned</span>
                )}
              </div>

              {/* Assign Team Dropdown */}
              {unassignedTeams.length > 0 && (
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none focus:ring-4 focus:ring-brand-teal/10 focus:border-brand-teal transition-all cursor-pointer"
                    onChange={(e) => handleAssignTeam(pool.id, e.target.value)}
                    value=""
                  >
                    <option value="" disabled>+ Assign team to {pool.name}...</option>
                    {unassignedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <button 
                onClick={() => generateMatches(pool.id)}
                className="mt-2 text-[10px] font-black text-brand-coral uppercase tracking-[0.2em] border-2 border-brand-coral/10 rounded-2xl py-4 hover:bg-brand-coral hover:text-white hover:border-brand-coral transition-all"
              >
                🔄 Generate Round Robin Matches
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Setup;
