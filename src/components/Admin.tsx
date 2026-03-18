import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Trophy, Users, LayoutGrid } from 'lucide-react';
import type { Team } from '../types/tournament';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'teams' | 'pools' | 'brackets'>('teams');
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Team form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPool, setNewTeamPool] = useState('');

  // Pool Match form states
  const [newMatchPool, setNewMatchPool] = useState('');
  const [newMatchT1, setNewMatchT1] = useState('');
  const [newMatchT2, setNewMatchT2] = useState('');
  const [newMatchTime, setNewMatchTime] = useState('');
  const [newMatchCourt, setNewMatchCourt] = useState('');
  const [newMatchWork, setNewMatchWork] = useState('');

  // Bracket Match form states
  const [newBracketName, setNewBracketName] = useState('');
  const [newBracketRound, setNewBracketRound] = useState('');
  const [newBracketLabel, setNewBracketLabel] = useState('');
  const [newBracketT1, setNewBracketT1] = useState('');
  const [newBracketT2, setNewBracketT2] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'teams') {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      if (error) console.error(error);
      else setTeams(data || []);
    } else {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          sets (*)
        `)
        .order('created_at');
      if (error) console.error(error);
      else setMatches(data || []);
    }
    setLoading(false);
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;

    const { error } = await supabase
      .from('teams')
      .insert([{ name: newTeamName, pool: newTeamPool }]);

    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: 'Team added successfully!', type: 'success' });
      setNewTeamName('');
      setNewTeamPool('');
      fetchData();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const addPoolMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchT1 || !newMatchT2) return;

    const { error } = await supabase
      .from('matches')
      .insert([{
        type: 'pool',
        pool_name: newMatchPool,
        team1_name: newMatchT1,
        team2_name: newMatchT2,
        time: newMatchTime,
        court: newMatchCourt,
        work_team: newMatchWork,
        status: 'pending'
      }]);

    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: 'Match added successfully!', type: 'success' });
      setNewMatchT1('');
      setNewMatchT2('');
      fetchData();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const addBracketMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBracketT1 || !newBracketT2) return;

    const { error } = await supabase
      .from('matches')
      .insert([{
        type: 'bracket',
        bracket_name: newBracketName,
        round: newBracketRound,
        label: newBracketLabel,
        team1_name: newBracketT1,
        team2_name: newBracketT2,
        status: 'pending'
      }]);

    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: 'Bracket match added successfully!', type: 'success' });
      setNewBracketT1('');
      setNewBracketT2('');
      fetchData();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const deleteItem = async (table: string, id: string) => {
    if (!window.confirm('Are you sure?')) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      setMessage({ text: `Error: ${error.message}`, type: 'error' });
    } else {
      setMessage({ text: 'Deleted successfully!', type: 'success' });
      fetchData();
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const updateMatchScore = async (matchId: string, team: 1 | 2, score: number) => {
    const field = team === 1 ? 'match_score1' : 'match_score2';
    const { error } = await supabase
      .from('matches')
      .update({ [field]: score, status: 'completed' })
      .eq('id', matchId);

    if (error) setMessage({ text: error.message, type: 'error' });
    else fetchData();
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div className="admin-tabs">
          <button className={activeTab === 'teams' ? 'active' : ''} onClick={() => setActiveTab('teams')}>
            <Users size={18} /> Teams
          </button>
          <button className={activeTab === 'pools' ? 'active' : ''} onClick={() => setActiveTab('pools')}>
            <LayoutGrid size={18} /> Pools
          </button>
          <button className={activeTab === 'brackets' ? 'active' : ''} onClick={() => setActiveTab('brackets')}>
            <Trophy size={18} /> Brackets
          </button>
        </div>
      </div>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="admin-content">
        {activeTab === 'teams' && (
          <div className="card">
            <h3>Manage Teams</h3>
            <form onSubmit={addTeam} className="admin-form">
              <input type="text" placeholder="Team Name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
              <input type="text" placeholder="Pool (e.g. Pool A)" value={newTeamPool} onChange={(e) => setNewTeamPool(e.target.value)} />
              <button type="submit" className="success-button"><Plus size={18} /> Add Team</button>
            </form>

            {loading ? <p>Loading...</p> : (
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Pool</th><th>Actions</th></tr></thead>
                <tbody>
                  {teams.map(team => (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>{team.pool}</td>
                      <td><button className="danger-button" onClick={() => deleteItem('teams', team.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="card">
            <h3>Pool Matches</h3>
            <form onSubmit={addPoolMatch} className="admin-form" style={{ gridTemplateColumns: 'repeat(3, 1fr) auto' }}>
              <input type="text" placeholder="Pool Name" value={newMatchPool} onChange={(e) => setNewMatchPool(e.target.value)} />
              <input type="text" placeholder="Team 1" value={newMatchT1} onChange={(e) => setNewMatchT1(e.target.value)} />
              <input type="text" placeholder="Team 2" value={newMatchT2} onChange={(e) => setNewMatchT2(e.target.value)} />
              <input type="text" placeholder="Time" value={newMatchTime} onChange={(e) => setNewMatchTime(e.target.value)} />
              <input type="text" placeholder="Court" value={newMatchCourt} onChange={(e) => setNewMatchCourt(e.target.value)} />
              <input type="text" placeholder="Work Team" value={newMatchWork} onChange={(e) => setNewMatchWork(e.target.value)} />
              <button type="submit" className="success-button"><Plus size={18} /> Add Match</button>
            </form>

            {loading ? <p>Loading...</p> : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pool</th>
                    <th>Teams</th>
                    <th>Score</th>
                    <th>Info</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.filter(m => m.type === 'pool').map(m => (
                    <tr key={m.id}>
                      <td>{m.pool_name}</td>
                      <td>{m.team1_name} vs {m.team2_name}</td>
                      <td>
                        <input type="number" style={{width: 40}} value={m.match_score1} onChange={(e) => updateMatchScore(m.id, 1, parseInt(e.target.value))} />
                        -
                        <input type="number" style={{width: 40}} value={m.match_score2} onChange={(e) => updateMatchScore(m.id, 2, parseInt(e.target.value))} />
                      </td>
                      <td>{m.time} | Crt {m.court}</td>
                      <td><button className="danger-button" onClick={() => deleteItem('matches', m.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'brackets' && (
          <div className="card">
            <h3>Bracket Matches</h3>
            <form onSubmit={addBracketMatch} className="admin-form" style={{ gridTemplateColumns: 'repeat(3, 1fr) auto' }}>
              <input type="text" placeholder="Bracket (e.g. Gold)" value={newBracketName} onChange={(e) => setNewBracketName(e.target.value)} />
              <input type="text" placeholder="Round (e.g. Quarterfinals)" value={newBracketRound} onChange={(e) => setNewBracketRound(e.target.value)} />
              <input type="text" placeholder="Label (e.g. Game 1)" value={newBracketLabel} onChange={(e) => setNewBracketLabel(e.target.value)} />
              <input type="text" placeholder="Team 1" value={newBracketT1} onChange={(e) => setNewBracketT1(e.target.value)} />
              <input type="text" placeholder="Team 2" value={newBracketT2} onChange={(e) => setNewBracketT2(e.target.value)} />
              <button type="submit" className="success-button"><Plus size={18} /> Add Bracket Match</button>
            </form>

            {loading ? <p>Loading...</p> : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Bracket</th>
                    <th>Round</th>
                    <th>Teams</th>
                    <th>Score</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.filter(m => m.type === 'bracket').map(m => (
                    <tr key={m.id}>
                      <td>{m.bracket_name}</td>
                      <td>{m.round} - {m.label}</td>
                      <td>{m.team1_name} vs {m.team2_name}</td>
                      <td>
                        <input type="number" style={{width: 40}} value={m.match_score1} onChange={(e) => updateMatchScore(m.id, 1, parseInt(e.target.value))} />
                        -
                        <input type="number" style={{width: 40}} value={m.match_score2} onChange={(e) => updateMatchScore(m.id, 2, parseInt(e.target.value))} />
                      </td>
                      <td><button className="danger-button" onClick={() => deleteItem('matches', m.id)}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
