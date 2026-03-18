import { useState, useEffect } from 'react'
import { fetchTournamentData } from './services/dataService'
import type { TournamentData } from './types/tournament'
import { Trophy, Users, LayoutGrid } from 'lucide-react'
import './App.css'

function App() {
  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<{ type: 'home' | 'teams' | 'pool' | 'bracket', id?: string }>({ type: 'home' })

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

  const bracketNames = Array.from(new Set(data.bracket.map(b => b.bracketName)))

  const getTeamBrackets = (teamName: string) => {
    return Array.from(new Set(
      data.bracket
        .filter(b => b.team1 === teamName || b.team2 === teamName)
        .map(b => b.bracketName)
    ))
  }

  return (
    <div className="container">
      <header>
        <h1 onClick={() => setView({ type: 'home' })} style={{ cursor: 'pointer' }}>Volleyball Tournament</h1>
        <div className="nav">
          <button className={view.type === 'home' ? 'active' : ''} onClick={() => setView({ type: 'home' })}>
            <LayoutGrid size={18} /> Home
          </button>
          <button className={view.type === 'teams' ? 'active' : ''} onClick={() => setView({ type: 'teams' })}>
            <Users size={18} /> Teams
          </button>
        </div>
      </header>

      <main>
        {view.type === 'home' && (
          <div className="home-view">
            <div className="section">
              <h2>Teams</h2>
              <button className="big-button" onClick={() => setView({ type: 'teams' })}>
                <Users size={24} /> View All Teams
              </button>
            </div>

            <div className="section">
              <h2>Pools</h2>
              <div className="button-grid">
                {data.pools.map(pool => (
                  <button key={pool.name} className="big-button" onClick={() => setView({ type: 'pool', id: pool.name })}>
                    <LayoutGrid size={24} /> {pool.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="section">
              <h2>Brackets</h2>
              <div className="button-grid">
                {bracketNames.map(name => (
                  <button key={name} className="big-button" onClick={() => setView({ type: 'bracket', id: name })}>
                    <Trophy size={24} /> {name} Bracket
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {view.type === 'teams' && (
          <div className="card">
            <h2>Teams</h2>
            <table>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Pool / Bracket</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map(team => {
                  const teamBrackets = getTeamBrackets(team.name);
                  return (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <a href="#" onClick={(e) => { e.preventDefault(); setView({ type: 'pool', id: team.pool }) }}>
                            {team.pool}
                          </a>
                          {teamBrackets.map(b => (
                            <a key={b} href="#" onClick={(e) => { e.preventDefault(); setView({ type: 'bracket', id: b }) }}>
                              {b}
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <button className="back-button" onClick={() => setView({ type: 'home' })}>Back to Home</button>
          </div>
        )}

        {view.type === 'pool' && (
          <div className="pools-view">
            {data.pools.filter(p => p.name === view.id).map(pool => (
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
                  <div className="matches-list-compact">
                    {pool.matches.map(match => {
                      const isT1Winner = (match.matchScore1 || 0) > (match.matchScore2 || 0);
                      const isT2Winner = (match.matchScore2 || 0) > (match.matchScore1 || 0);
                      
                      // If no sets exist but match exists, show 0-0 for first 2 sets
                      const displaySets = match.sets && match.sets.length > 0 
                        ? match.sets 
                        : (match.id ? [{score1: 0, score2: 0}, {score1: 0, score2: 0}] : []);

                      return (
                        <div key={match.id} className="match-row-compact">
                          <div className="match-main-info">
                            <span className="match-id-label">{match.id}</span>
                            <span className="match-time-court">
                              {match.time} {(match.time && match.court) ? '|' : ''} {match.court ? `Crt ${match.court}` : ''}
                            </span>
                            
                            <div className="match-teams-vs">
                              <span className={`team-name-compact ${isT1Winner ? 'winner-underline' : ''}`}>
                                {match.team1 || 'TBD'}
                              </span>
                              <span className="vs-label">vs</span>
                              <span className={`team-name-compact ${isT2Winner ? 'winner-underline' : ''}`}>
                                {match.team2 || 'TBD'}
                              </span>
                            </div>

                            {match.workTeam && (
                              <span className="work-team-compact">
                                (Work: {match.workTeam})
                              </span>
                            )}
                          </div>

                          <div className="match-scores-compact">
                            {displaySets.map((s, i) => (
                              <span key={i} className="set-box-compact">
                                {s.score1}-{s.score2}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
            <button className="back-button" onClick={() => setView({ type: 'home' })}>Back to Home</button>
          </div>
        )}

        {view.type === 'bracket' && (
          <div className="bracket-view">
            <div className="bracket-section">
              <h2>{view.id} Bracket</h2>
              <div className="grid">
                {data.bracket
                  .filter(b => b.bracketName === view.id)
                  .map(match => {
                    const isT1Winner = match.winner === match.team1 || (match.matchScore1 || 0) > (match.matchScore2 || 0);
                    const isT2Winner = match.winner === match.team2 || (match.matchScore2 || 0) > (match.matchScore1 || 0);
                    const displaySets = match.sets && match.sets.length > 0 
                      ? match.sets 
                      : (match.id ? [{score1: 0, score2: 0}, {score1: 0, score2: 0}] : []);

                    return (
                      <div key={match.id} className="match-row-compact bracket-row">
                        <div className="match-main-info">
                          <span className="match-id-label">{match.round}</span>
                          <span className="match-time-court">{match.label}</span>
                          
                          <div className="match-teams-vs">
                            <span className={`team-name-compact ${isT1Winner ? 'winner-underline' : ''}`}>
                              {match.team1 || 'TBD'}
                            </span>
                            <span className="vs-label">vs</span>
                            <span className={`team-name-compact ${isT2Winner ? 'winner-underline' : ''}`}>
                              {match.team2 || 'TBD'}
                            </span>
                          </div>

                          {match.workTeam && (
                            <span className="work-team-compact">
                              (Work: {match.workTeam})
                            </span>
                          )}
                        </div>

                        <div className="match-scores-compact">
                          {displaySets.map((s, i) => (
                            <span key={i} className="set-box-compact">
                              {s.score1}-{s.score2}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
            <button className="back-button" onClick={() => setView({ type: 'home' })}>Back to Home</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
