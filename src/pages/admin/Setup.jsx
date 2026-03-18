import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

const Setup = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tournament');
  const [tournament, setTournament] = useState({
    name: '',
    date: '',
    location: '',
    info: '',
    admin_password: '',
    is_active: true
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

  const handleSaveTournament = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    let result;
    if (tournament.id) {
      result = await supabase
        .from('tournaments')
        .update(tournament)
        .eq('id', tournament.id);
    } else {
      result = await supabase
        .from('tournaments')
        .insert([tournament])
        .select();
    }

    if (result.error) {
      alert('Error saving tournament: ' + result.error.message);
    } else {
      if (!tournament.id && result.data) {
        setTournament(result.data[0]);
        localStorage.setItem('tournamentId', result.data[0].id);
      }
      alert('Tournament saved successfully!');
    }
    setSaving(false);
  };

  if (loading) return <Layout title="Setup"><div className="p-8 text-center">Loading Setup...</div></Layout>;

  return (
    <Layout title="Tournament Setup">
      <div className="flex flex-col gap-6 py-2">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
          {['tournament', 'age groups', 'teams', 'pools'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab ? 'border-tvvc-blue text-tvvc-blue' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Sections */}
        <div className="py-4">
          {activeTab === 'tournament' && (
            <form onSubmit={handleSaveTournament} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Tournament Name</label>
                <input
                  type="text"
                  required
                  value={tournament.name}
                  onChange={e => setTournament({...tournament, name: e.target.value})}
                  className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-tvvc-blue outline-none font-semibold"
                  placeholder="e.g. TVVC Summer Grass Open"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Date</label>
                  <input
                    type="date"
                    required
                    value={tournament.date}
                    onChange={e => setTournament({...tournament, date: e.target.value})}
                    className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-tvvc-blue outline-none font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Admin Password</label>
                  <input
                    type="text"
                    required
                    value={tournament.admin_password}
                    onChange={e => setTournament({...tournament, admin_password: e.target.value})}
                    className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-tvvc-blue outline-none font-semibold"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Location</label>
                <input
                  type="text"
                  value={tournament.location || ''}
                  onChange={e => setTournament({...tournament, location: e.target.value})}
                  className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-tvvc-blue outline-none font-semibold"
                  placeholder="Venue name or address"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Rules & Info</label>
                <textarea
                  rows="6"
                  value={tournament.info || ''}
                  onChange={e => setTournament({...tournament, info: e.target.value})}
                  className="p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-tvvc-blue outline-none text-sm leading-relaxed"
                  placeholder="Add tournament details, rules, contact info..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary py-4 mt-4 shadow-lg shadow-tvvc-blue/20"
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
  const [ageGroups, setAgeGroups] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchAgeGroups();
  }, [tournamentId]);

  async function fetchAgeGroups() {
    const { data } = await supabase
      .from('age_groups')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('display_order');
    if (data) setAgeGroups(data);
  }

  const handleAdd = async () => {
    if (!newName) return;
    const { error } = await supabase
      .from('age_groups')
      .insert([{ tournament_id: tournamentId, name: newName, display_order: ageGroups.length }]);
    if (error) alert(error.message);
    else {
      setNewName('');
      fetchAgeGroups();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will delete all teams and pools in this group.')) return;
    await supabase.from('age_groups').delete().eq('id', id);
    fetchAgeGroups();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newName} 
          onChange={e => setNewName(e.target.value)}
          placeholder="New Age Group (e.g. Open)"
          className="flex-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-tvvc-blue font-semibold"
        />
        <button onClick={handleAdd} className="btn btn-primary px-6">Add</button>
      </div>
      <div className="flex flex-col gap-2">
        {ageGroups.map(group => (
          <div key={group.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
            <span className="font-bold">{group.name}</span>
            <button onClick={() => handleDelete(group.id)} className="text-red-500 text-xs font-bold uppercase px-2 py-1">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TeamsManager = ({ tournamentId }) => {
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    fetchAgeGroups();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedGroupId) fetchTeams();
  }, [selectedGroupId]);

  async function fetchAgeGroups() {
    const { data } = await supabase.from('age_groups').select('*').eq('tournament_id', tournamentId).order('display_order');
    if (data) {
      setAgeGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    }
  }

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('*').eq('age_group_id', selectedGroupId).order('name');
    if (data) setTeams(data);
  }

  const handleAddTeam = async () => {
    if (!newTeamName || !selectedGroupId) return;
    await supabase.from('teams').insert([{ age_group_id: selectedGroupId, name: newTeamName }]);
    setNewTeamName('');
    fetchTeams();
  };

  const handleDeleteTeam = async (id) => {
    await supabase.from('teams').delete().eq('id', id);
    fetchTeams();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Select Age Group</label>
        <select 
          value={selectedGroupId} 
          onChange={e => setSelectedGroupId(e.target.value)}
          className="p-3 border rounded-lg outline-none font-semibold bg-white"
        >
          {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newTeamName} 
          onChange={e => setNewTeamName(e.target.value)}
          placeholder="New Team Name"
          className="flex-1 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-tvvc-blue font-semibold"
        />
        <button onClick={handleAddTeam} className="btn btn-primary px-6">Add</button>
      </div>

      <div className="flex flex-col gap-2">
        {teams.map(team => (
          <div key={team.id} className="bg-white p-3 rounded-lg border flex justify-between items-center text-sm shadow-sm">
            <span className="font-semibold">{team.name}</span>
            <button onClick={() => handleDeleteTeam(team.id)} className="text-red-400 hover:text-red-600">×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const PoolsManager = ({ tournamentId }) => {
  const [ageGroups, setAgeGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [pools, setPools] = useState([]);
  const [teams, setTeams] = useState([]);
  const [poolTeams, setPoolTeams] = useState({}); // poolId -> array of team objects
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
    const { data } = await supabase.from('age_groups').select('*').eq('tournament_id', tournamentId).order('display_order');
    if (data) {
      setAgeGroups(data);
      if (data.length > 0) setSelectedGroupId(data[0].id);
    }
  }

  async function fetchPools() {
    const { data } = await supabase.from('pools').select('*').eq('age_group_id', selectedGroupId).order('display_order');
    if (data) {
      setPools(data);
      // Fetch teams for each pool
      const poolTeamData = {};
      for (const pool of data) {
        const { data: pt } = await supabase.from('pool_teams').select('teams(id, name)').eq('pool_id', pool.id);
        poolTeamData[pool.id] = pt?.map(p => p.teams) || [];
      }
      setPoolTeams(poolTeamData);
    }
  }

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('*').eq('age_group_id', selectedGroupId).order('name');
    if (data) setTeams(data);
  }

  const handleAddPool = async () => {
    if (!newPool.name || !newPool.court || !selectedGroupId) return;
    await supabase.from('pools').insert([{ 
      age_group_id: selectedGroupId, 
      name: newPool.name, 
      court: newPool.court, 
      display_order: pools.length 
    }]);
    setNewPool({ name: '', court: '' });
    fetchPools();
  };

  const handleDeletePool = async (id) => {
    if (!confirm('Delete pool and all its matches?')) return;
    await supabase.from('pools').delete().eq('id', id);
    fetchPools();
  };

  const handleAssignTeam = async (poolId, teamId) => {
    if (!teamId) return;
    await supabase.from('pool_teams').insert([{ pool_id: poolId, team_id: teamId }]);
    fetchPools();
  };

  const handleRemoveTeam = async (poolId, teamId) => {
    await supabase.from('pool_teams').delete().eq('pool_id', poolId).eq('team_id', teamId);
    fetchPools();
  };

  const generateMatches = async (poolId) => {
    const teamsInPool = poolTeams[poolId] || [];
    if (teamsInPool.length < 2) {
      alert('Need at least 2 teams to generate matches');
      return;
    }

    // Basic Round Robin generation
    const matches = [];
    for (let i = 0; i < teamsInPool.length; i++) {
      for (let j = i + 1; j < teamsInPool.length; j++) {
        matches.push({
          age_group_id: selectedGroupId,
          pool_id: poolId,
          match_type: 'pool',
          team1_id: teamsInPool[i].id,
          team2_id: teamsInPool[j].id,
          match_order: matches.length + 1,
          status: 'scheduled'
        });
      }
    }

    if (confirm(`Generate ${matches.length} matches for this pool? This will delete existing matches.`)) {
      await supabase.from('matches').delete().eq('pool_id', poolId);
      const { error } = await supabase.from('matches').insert(matches);
      if (error) alert(error.message);
      else alert('Matches generated!');
    }
  };

  const unassignedTeams = teams.filter(t => 
    !Object.values(poolTeams).flat().some(pt => pt.id === t.id)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Select Age Group</label>
        <select 
          value={selectedGroupId} 
          onChange={e => setSelectedGroupId(e.target.value)}
          className="p-3 border rounded-lg outline-none font-semibold bg-white"
        >
          {ageGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Add Pool Form */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Add New Pool</h4>
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="text" 
            placeholder="Pool Name (A, B...)" 
            value={newPool.name}
            onChange={e => setNewPool({...newPool, name: e.target.value})}
            className="p-2 border rounded-lg text-sm font-semibold"
          />
          <input 
            type="text" 
            placeholder="Court (1, 2...)" 
            value={newPool.court}
            onChange={e => setNewPool({...newPool, court: e.target.value})}
            className="p-2 border rounded-lg text-sm font-semibold"
          />
        </div>
        <button onClick={handleAddPool} className="btn btn-primary text-xs py-3 uppercase">Create Pool</button>
      </div>

      {/* Pools List */}
      <div className="flex flex-col gap-6">
        {pools.map(pool => (
          <div key={pool.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 p-3 flex justify-between items-center border-b">
              <span className="font-black text-tvvc-blue uppercase italic">{pool.name} • {pool.court}</span>
              <button onClick={() => handleDeletePool(pool.id)} className="text-red-400 text-xs font-bold uppercase">Delete</button>
            </div>
            
            <div className="p-4 flex flex-col gap-4">
              {/* Teams in Pool */}
              <div className="flex flex-wrap gap-2">
                {poolTeams[pool.id]?.map(team => (
                  <div key={team.id} className="bg-blue-50 text-tvvc-blue px-2 py-1 rounded-md text-xs font-bold border border-blue-100 flex items-center gap-2">
                    {team.name}
                    <button onClick={() => handleRemoveTeam(pool.id, team.id)} className="text-blue-300 hover:text-red-500 font-black">×</button>
                  </div>
                ))}
              </div>

              {/* Assign Team Dropdown */}
              {unassignedTeams.length > 0 && (
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2 border rounded-lg text-xs font-semibold bg-white"
                    onChange={(e) => handleAssignTeam(pool.id, e.target.value)}
                    value=""
                  >
                    <option value="" disabled>Assign team to {pool.name}...</option>
                    {unassignedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <button 
                onClick={() => generateMatches(pool.id)}
                className="mt-2 text-[10px] font-bold text-tvvc-orange uppercase tracking-widest border border-tvvc-orange/20 rounded-lg py-2 hover:bg-tvvc-orange/5 transition-colors"
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
