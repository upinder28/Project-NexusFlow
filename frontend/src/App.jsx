import { useState } from 'react';
import Canvas from './pages/Canvas';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nf_user')); } catch { return null; }
  });
  const [page, setPage] = useState('login');

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    localStorage.removeItem('nf_token');
    localStorage.removeItem('nf_user');
    setUser(null);
    setPage('login');
  };

  if (!user) {
    return page === 'login'
      ? <Login onLogin={handleLogin} onSwitch={() => setPage('signup')} />
      : <Signup onLogin={handleLogin} onSwitch={() => setPage('login')} />;
  }

  return <Canvas user={user} onLogout={handleLogout} />;
}

export default App;
