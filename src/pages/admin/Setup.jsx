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
  const [matchesMap, setMatchesMap] = useState({}); // poolId -> array of matches
  const [newPool, setNewPool] = useState({ name: '', court: '' });
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [manualMatch, setManualMatch] = useState({ poolId: null, team1Id: '', team2Id: '', matchOrder: '', court: '' });

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

  async function fetchMatches() {
    try {
      const data = await db.query.matches.findMany({
        where: and(eq(matches.ageGroupId, selectedGroupId), eq(matches.matchType, 'pool')),
        orderBy: [asc(matches.matchOrder)]
      });
      const mMap = {};
      data.forEach(m => {
        if (!mMap[m.poolId]) mMap[m.poolId] = [];
        mMap[m.poolId].push(m);
      });
      setMatchesMap(mMap);
    } catch (error) {
      console.error('Error fetching matches:', error);
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
        fetchMatches();
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
    const tId = teamId || selectedTeamId;
    if (!tId) return;
    try {
      await db.insert(poolTeams).values({ poolId, teamId: tId });
      setSelectedTeamId(null);
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
        { t1: 0, t2: 2 }, // 1v3
        { t1: 1, t2: 2 }, // 2v3
        { t1: 0, t2: 1 }  // 1v2
      ];
      matchesToCreate = schedule.map((m, idx) => ({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id: teamsInPool[m.t1].id,
        team2Id: teamsInPool[m.t2].id,
        matchOrder: idx + 1,
        status: 'scheduled'
      }));
    } else if (teamsInPool.length === 4) {
      const schedule = [
        { t1: 0, t2: 2 }, // 1v3
        { t1: 1, t2: 3 }, // 2v4
        { t1: 0, t2: 3 }, // 1v4
        { t1: 1, t2: 2 }, // 2v3
        { t1: 2, t2: 3 }, // 3v4
        { t1: 0, t2: 1 }  // 1v2
      ];
      matchesToCreate = schedule.map((m, idx) => ({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id: teamsInPool[m.t1].id,
        team2Id: teamsInPool[m.t2].id,
        matchOrder: idx + 1,
        status: 'scheduled'
      }));
    } else if (teamsInPool.length === 5) {
      const schedule = [
        // Wave 1
        { t1: 0, t2: 3, court: '1' }, // 1v4
        { t1: 1, t2: 4, court: '2' }, // 2v5
        // Wave 2
        { t1: 0, t2: 4, court: '1' }, // 1v5
        { t1: 1, t2: 2, court: '2' }, // 2v3
        // Wave 3
        { t1: 2, t2: 4, court: '1' }, // 3v5
        { t1: 1, t2: 3, court: '2' }, // 2v4
        // Wave 4
        { t1: 0, t2: 2, court: '1' }, // 1v3
        { t1: 3, t2: 4, court: '2' }, // 4v5
        // Wave 5
        { t1: 0, t2: 1, court: '1' }, // 1v2
        { t1: 2, t2: 3, court: '2' }  // 3v4
      ];
      matchesToCreate = schedule.map((m, idx) => ({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id: teamsInPool[m.t1].id,
        team2Id: teamsInPool[m.t2].id,
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
        fetchMatches();
        alert('Matches generated!');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleAddManualMatch = async (poolId) => {
    const { team1Id, team2Id, matchOrder, court } = manualMatch;
    if (!team1Id || !team2Id || !matchOrder) {
      alert('Team 1, Team 2 and Order are required');
      return;
    }
    try {
      await db.insert(matches).values({
        ageGroupId: selectedGroupId,
        poolId: poolId,
        matchType: 'pool',
        team1Id,
        team2Id,
        matchOrder: parseInt(matchOrder),
        court: court || null,
        status: 'scheduled'
      });
      setManualMatch({ poolId: null, team1Id: '', team2Id: '', matchOrder: '', court: '' });
      fetchMatches();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (!confirm('Delete this match?')) return;
    try {
      await db.delete(matches).where(eq(matches.id, id));
      fetchMatches();
    } catch (error) {
      alert(error.message);
    }
  };

  const getTeamName = (id) => {
    const team = teamsList.find(t => t.id === id);
    return team ? team.name : 'Unknown';
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

      {/* Unassigned Teams Selection */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end px-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedTeamId ? 'Step 2: Click a Pool to Assign' : 'Step 1: Click a Team to Select'}
          </h4>
          {selectedTeamId && (
            <button 
              onClick={() => setSelectedTeamId(null)}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
              Cancel Selection
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 min-h-[100px]">
          {unassignedTeams.length > 0 ? unassignedTeams.map(team => (
            <button
              key={team.id}
              onClick={() => setSelectedTeamId(team.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                selectedTeamId === team.id 
                  ? 'bg-brand-teal text-white border-brand-teal scale-105 shadow-teal-500/20' 
                  : 'bg-white text-slate-600 border-slate-100 hover:border-brand-teal/30 hover:shadow-md active:scale-95'
              }`}
            >
              {team.name}
            </button>
          )) : (
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic w-full text-center">All teams assigned</span>
          )}
        </div>
      </div>

      {/* Pools List */}
      <div className="flex flex-col gap-8">
        {poolsList.map(pool => (
          <div 
            key={pool.id} 
            className={`bg-white rounded-[2rem] border transition-all overflow-hidden cursor-default ${
              selectedTeamId 
                ? 'border-brand-teal/30 ring-4 ring-brand-teal/5 hover:border-brand-teal hover:ring-brand-teal/10 hover:shadow-xl' 
                : 'border-slate-100 shadow-sm hover:shadow-md'
            }`}
            onClick={() => selectedTeamId && handleAssignTeam(pool.id)}
          >
            <div className="bg-slate-50 p-5 flex justify-between items-center border-b border-slate-100">
              <div className="flex flex-col">
                <span className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{pool.name}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pool.court}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDeletePool(pool.id); }} className="text-rose-400 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-rose-50 rounded-full transition-colors">Delete</button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              {/* Teams in Pool */}
              <div className="flex flex-wrap gap-2 min-h-[2rem]">
                {poolTeamsMap[pool.id]?.length > 0 ? poolTeamsMap[pool.id]?.map(team => (
                  <div key={team.id} className="bg-teal-50 text-brand-teal px-4 py-2 rounded-full text-[10px] font-black border border-teal-100 flex items-center gap-3 uppercase tracking-wider">
                    {team.name}
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveTeam(pool.id, team.id); }} className="text-teal-300 hover:text-rose-500 font-black text-sm">×</button>
                  </div>
                )) : (
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest px-1 italic">No teams assigned</span>
                )}
              </div>

              {selectedTeamId && (
                <div className="py-4 border-2 border-dashed border-brand-teal/20 rounded-2xl flex items-center justify-center bg-brand-teal/5 animate-pulse">
                  <span className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Click to Assign Selected Team</span>
                </div>
              )}

              {/* Matches List */}
              <div className="flex flex-col gap-4 border-t border-slate-50 pt-6">
                <div className="flex justify-between items-center px-1">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pool Matches</h5>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setManualMatch({...manualMatch, poolId: manualMatch.poolId === pool.id ? null : pool.id}); }}
                    className="text-[10px] font-black text-brand-teal uppercase tracking-widest"
                  >
                    {manualMatch.poolId === pool.id ? 'Close Manual Add' : '+ Add Manual Match'}
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {(matchesMap[pool.id] || []).map(match => (
                    <div key={match.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group/match">
                      <div className="flex items-center gap-4">
                        <span className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400">{match.matchOrder}</span>
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-700">
                          <span className={match.winnerId === match.team1Id ? 'text-brand-teal' : ''}>{getTeamName(match.team1Id)}</span>
                          <span className="text-slate-300 italic font-medium">vs</span>
                          <span className={match.winnerId === match.team2Id ? 'text-brand-teal' : ''}>{getTeamName(match.team2Id)}</span>
                        </div>
                        {match.court && (
                          <span className="text-[10px] font-bold text-brand-teal uppercase tracking-tighter bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">{match.court}</span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match.id); }}
                        className="text-rose-400 hover:text-rose-600 opacity-0 group-hover/match:opacity-100 transition-opacity p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(!matchesMap[pool.id] || matchesMap[pool.id].length === 0) && (
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic text-center py-2">No matches scheduled</span>
                  )}
                </div>

                {manualMatch.poolId === pool.id && (
                  <div className="bg-white p-4 rounded-2xl border-2 border-brand-teal/20 flex flex-col gap-4 shadow-xl" onClick={e => e.stopPropagation()}>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Order</label>
                        <input 
                          type="number" 
                          placeholder="#" 
                          value={manualMatch.matchOrder}
                          onChange={e => setManualMatch({...manualMatch, matchOrder: e.target.value})}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1 col-span-3">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Court (Optional)</label>
                        <input 
                          type="text" 
                          placeholder={pool.court}
                          value={manualMatch.court}
                          onChange={e => setManualMatch({...manualMatch, court: e.target.value})}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Team 1</label>
                        <select 
                          value={manualMatch.team1Id}
                          onChange={e => setManualMatch({...manualMatch, team1Id: e.target.value})}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select Team</option>
                          {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Team 2</label>
                        <select 
                          value={manualMatch.team2Id}
                          onChange={e => setManualMatch({...manualMatch, team2Id: e.target.value})}
                          className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select Team</option>
                          {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleAddManualMatch(pool.id)}
                      className="btn btn-primary py-3 text-[10px] font-black uppercase tracking-widest"
                    >
                      Save Match to Pool
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); generateMatches(pool.id); }}
                className="mt-2 text-[10px] font-black text-brand-coral uppercase tracking-[0.2em] border-2 border-brand-coral/10 rounded-2xl py-4 hover:bg-brand-coral hover:text-white hover:border-brand-coral transition-all"
              >
                🔄 Auto-Generate Round Robin (Resets Pool)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Setup;
