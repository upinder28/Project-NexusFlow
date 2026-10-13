import { useState } from 'react';

export default function Signup({ onLogin, onSwitch }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      localStorage.setItem('nf_token', data.token);
      localStorage.setItem('nf_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch {
      setError('Server not reachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        <div style={s.logo}>⚡ NexusFlow</div>
        <div style={s.title}>Create account</div>
        <div style={s.sub}>Start building IoT pipelines</div>

        <form onSubmit={submit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input style={s.input} name="name" type="text" placeholder="Your name"
              value={form.name} onChange={handle} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} name="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} name="password" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={handle} required />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div style={s.footer}>
          Already have an account?{' '}
          <span style={s.link} onClick={onSwitch}>Sign in</span>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#06080f', fontFamily: 'Inter, sans-serif' },
  card: { background: '#0a0d16', border: '1px solid #ffffff12', borderRadius: 16, padding: '40px 36px', width: 360 },
  logo: { fontSize: 20, fontWeight: 700, color: '#58a6ff', marginBottom: 24, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: 700, color: '#f0f6fc', marginBottom: 6, textAlign: 'center' },
  sub: { fontSize: 13, color: '#6e7681', marginBottom: 28, textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#8b949e' },
  input: { background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: '10px 12px', color: '#f0f6fc', fontSize: 13, outline: 'none', fontFamily: 'Inter, sans-serif' },
  error: { fontSize: 12, color: '#f85149', background: '#f8514910', border: '1px solid #f8514930', borderRadius: 7, padding: '8px 12px' },
  btn: { background: 'linear-gradient(135deg, #1a3a5c, #1e4976)', color: '#58a6ff', border: '1px solid #1f6feb', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: 4 },
  footer: { marginTop: 24, textAlign: 'center', fontSize: 12, color: '#6e7681' },
  link: { color: '#58a6ff', cursor: 'pointer', fontWeight: 600 },
};
