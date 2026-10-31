import { Link } from 'react-router-dom';
import Logo from '../assets/Logo.png';

export default function AuthLanding() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg-gradient)', color: 'var(--app-text)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 24px 24px', fontFamily: "'Space Grotesk', 'DM Sans', 'Segoe UI', sans-serif", overflow: 'hidden', scrollbarWidth: 'none' }}>
      <style>{`
        html, body { height: 100%; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none; }
        body::-webkit-scrollbar, html::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
      <div style={{ width: 'min(1040px, 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, marginTop: 28 }}>
        <div style={{ textAlign: 'center', maxWidth: 720 }}>
          <img src={Logo} alt="Alliance Team Titans logo" style={{ width: 56, height: 56, marginBottom: 10 }} />
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.24em', color: 'var(--app-muted)', fontSize: 12, marginBottom: 8 }}>Alliance Team Titans</div>
          <h1 style={{ margin: '0 0 10px', fontSize: 'clamp(2rem, 5vw, 3.4rem)', lineHeight: 1.05 }}>Student Performance Tracker</h1>
          <p style={{ margin: 0, color: 'var(--app-muted)', fontSize: 16 }}>One secure sign-in for students, professors, and administrators.</p>
        </div>

        <div style={{ width: '100%', maxWidth: 420, padding: 32, borderRadius: 20, border: '1px solid var(--app-border)', background: 'var(--app-card)', boxShadow: 'var(--app-shadow-lg)', textAlign: 'center', backdropFilter: 'blur(14px)' }}>
          <p style={{ margin: '0 0 24px', color: 'var(--app-muted)', lineHeight: 1.5 }}>
            Your account permissions and dashboard are assigned automatically after sign-in.
          </p>
          <Link className="btn-primary" to="/login" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/signup" style={{ color: 'var(--app-text)', textDecoration: 'underline', textUnderlineOffset: 4 }}>Create a new account</Link>
        </div>
      </div>
    </div>
  );
}
