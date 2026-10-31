import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../controllers/accountController';
import Logo from '../assets/Logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await requestPasswordReset(email);
      setMessage(data?.message || 'If the email exists, a reset link has been sent.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to request reset.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <img className="brand-logo" src={Logo} alt="Alliance Team Titans logo" />
        <h1 className="login-title">Reset your password</h1>
        <p className="login-sub">Enter your email and we’ll send you a reset link.</p>

        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '1rem' }}>
          <div className="login-field">
            <label className="login-label">Email</label>
            <div className="login-input">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        {message && <div className="helper-text" style={{ marginTop: 12 }}>{message}</div>}

        <p className="footer-text" style={{ marginTop: '1rem' }}>
          Remembered your password? <Link className="link" to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
