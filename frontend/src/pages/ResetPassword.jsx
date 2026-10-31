import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../controllers/accountController';
import Logo from '../assets/Logo.png';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await confirmPasswordReset(token, form.password);
      setMessage(data?.message || 'Password updated.');
      setTimeout(() => navigate('/login'), 900);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <img className="brand-logo" src={Logo} alt="Alliance Team Titans logo" />
        <h1 className="login-title">Choose a new password</h1>
        <p className="login-sub">Create a new password for your account.</p>

        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '1rem' }}>
          <div className="login-field">
            <label className="login-label">New Password</label>
            <div className="login-input">
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>
          </div>
          <div className="login-field">
            <label className="login-label">Confirm Password</label>
            <div className="login-input">
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setField('confirm', e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Saving password...' : 'Save new password'}
          </button>
        </form>

        {message && <div className="helper-text" style={{ marginTop: 12 }}>{message}</div>}

        <p className="footer-text" style={{ marginTop: '1rem' }}>
          <Link className="link" to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
