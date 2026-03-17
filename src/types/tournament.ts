export interface Team {
  id: string;
  name: string;
  pool: string;
}

export interface Match {
  id: string;
  team1: string;
  team2: string;
  sets?: { score1: number; score2: number }[];
  matchScore1?: number; // Sets won by team1
  matchScore2?: number; // Sets won by team2
  time?: string;
  court?: string;
  status: 'pending' | 'live' | 'completed';
}

export interface Pool {
  name: string;
  teams: Team[];
  matches: Match[];
  standings?: Standing[];
}

export interface Standing {
  teamName: string;
  matchWins: number;
  matchLosses: number;
  setWins: number;
  setLosses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface BracketMatch {
  id: string;
  round: string;
  label: string;
  team1: string;
  team2: string;
  sets?: { score1: number; score2: number }[];
  matchScore1?: number;
  matchScore2?: number;
  winner?: string;
  bracketName: string;
}

export interface TournamentData {
  teams: Team[];
  pools: Pool[];
  bracket: BracketMatch[];
}
