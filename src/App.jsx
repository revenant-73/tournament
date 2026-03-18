import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/public/Home';
import TeamList from './pages/public/TeamList';
import Pool from './pages/public/Pool';
import Bracket from './pages/public/Bracket';
import Info from './pages/public/Info';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSetup from './pages/admin/Setup';
import AdminPoolScores from './pages/admin/PoolScores';
import AdminSeeding from './pages/admin/Seeding';
import AdminBracketScores from './pages/admin/BracketScores';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pool/:id" element={<Pool />} />
          <Route path="/bracket/:id" element={<Bracket />} />
          <Route path="/teams" element={<TeamList />} />
          <Route path="/info" element={<Info />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin/scores/pools" element={<AdminPoolScores />} />
          <Route path="/admin/scores/brackets" element={<AdminBracketScores />} />
          <Route path="/admin/seeding" element={<AdminSeeding />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
