import { useState, useEffect } from 'react'
import { fetchTournamentData } from './services/dataService'
import { TournamentData } from './types/tournament'
import { Trophy, Users, LayoutGrid } from 'lucide-react'
import './App.css'

function App() {
  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'teams' | 'pools' | 'bracket'>('pools')

  useEffect(() => {
    const loadData = async () => {
      try {
        const tournamentData = await fetchTournamentData()
        setData(tournamentData)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="loading">Loading tournament data...</div>
  if (!data) return <div className="error">Failed to load data. Check Google Sheet ID.</div>

  return (
    <div className="container">
      <header>
        <h1>Volleyball Tournament</h1>
        <div className="nav">
          <button className={activeTab === 'pools' ? 'active' : ''} onClick={() => setActiveTab('pools')}>
            <LayoutGrid size={18} /> Pools
          </button>
          <button className={activeTab === 'bracket' ? 'active' : ''} onClick={() => setActiveTab('bracket')}>
            <Trophy size={18} /> Bracket
          </button>
          <button className={activeTab === 'teams' ? 'active' : ''} onClick={() => setActiveTab('teams')}>
            <Users size={18} /> Teams
          </button>
        </div>
      </header>

      <main>
        {activeTab === 'teams' && (
          <div className="card">
            <h2>Teams</h2>
            <table>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Pool</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map(team => (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>{team.pool}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="pools-view">
            {data.pools.map(pool => (
              <div key={pool.name} className="pool-container">
                <div className="card">
                  <h3>{pool.name} Standings</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>M-W/L</th>
                        <th>S-W/L</th>
                        <th>Pts Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pool.standings?.map(s => (
                        <tr key={s.teamName}>
                          <td>{s.teamName}</td>
                          <td>{s.matchWins}-{s.matchLosses}</td>
                          <td>{s.setWins}-{s.setLosses}</td>
                          <td>{(s.pointsAgainst === 0 ? s.pointsFor : s.pointsFor / s.pointsAgainst).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card">
                  <h3>{pool.name} Matches</h3>
                  <div className="matches-list">
                    {pool.matches.map(match => (
                      <div key={match.id} className="match-card">
                        <div className="match-header">
                          <span className="match-time">{match.time} - Court {match.court}</span>
                          <span className={`badge badge-${match.status}`}>{match.status}</span>
                        </div>
                        <div className="match-teams">
                          <div className={`team-row ${match.matchScore1! > match.matchScore2! ? 'winner' : ''}`}>
                            <span className="team-name">{match.team1}</span>
                            <div className="sets">
                              {match.sets?.map((s, i) => <span key={i} className="set-score">{s.score1}</span>)}
                              <span className="match-score">({match.matchScore1})</span>
                            </div>
                          </div>
                          <div className={`team-row ${match.matchScore2! > match.matchScore1! ? 'winner' : ''}`}>
                            <span className="team-name">{match.team2}</span>
                            <div className="sets">
                              {match.sets?.map((s, i) => <span key={i} className="set-score">{s.score2}</span>)}
                              <span className="match-score">({match.matchScore2})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="bracket-view">
            {Array.from(new Set(data.bracket.map(b => b.bracketName))).map(bracketName => (
              <div key={bracketName} className="bracket-section">
                <h2>{bracketName}</h2>
                <div className="grid">
                  {data.bracket
                    .filter(b => b.bracketName === bracketName)
                    .map(match => (
                      <div key={match.id} className="match-card bracket-match">
                        <div className="match-header">
                          <span className="round-label">{match.round} - {match.label}</span>
                        </div>
                        <div className="match-teams">
                          <div className={`team-row ${match.winner === match.team1 ? 'winner' : ''}`}>
                            <span className="team-name">{match.team1}</span>
                            <div className="sets">
                              {match.sets?.map((s, i) => <span key={i} className="set-score">{s.score1}</span>)}
                              <span className="match-score">{match.matchScore1}</span>
                            </div>
                          </div>
                          <div className={`team-row ${match.winner === match.team2 ? 'winner' : ''}`}>
                            <span className="team-name">{match.team2}</span>
                            <div className="sets">
                              {match.sets?.map((s, i) => <span key={i} className="set-score">{s.score2}</span>)}
                              <span className="match-score">{match.matchScore2}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
