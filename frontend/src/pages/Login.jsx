import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../controllers/authController";
import { DEMO_ACCOUNT_HINTS } from "../models/demoAccounts";
import Logo from "../assets/Logo.png";

const initialForm = { email: "", password: "" };

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.email)
      e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email.";
    if (!form.password)
      e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await signIn(form);
      const role = data.user?.role;

      if (role === "STUDENT") navigate("/studenthome");
      else if (role === "PROFESSOR") navigate("/teacherhome");
      else if (role === "ADMIN") navigate("/adminhome");
      else navigate("/");

    } catch (err) {
      const responseData = err.response?.data;
      const msg =
        responseData?.non_field_errors?.[0] ||
        responseData?.detail ||
        responseData?.error ||
        responseData?.message ||
        "Invalid email or password.";

      if (responseData) setErrors({ password: msg });
      else setErrors({ password: "Unable to connect to the API. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <Link to="/">
          <img className="brand-logo" src={Logo} alt="Alliance Team Titans logo" />
        </Link>
        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">Use your school account to continue.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Email</label>
            <div className="login-input">
              <span className="login-icon">@</span>
              <input
                className={`login-text ${errors.email ? "finput-error" : ""}`}
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-input">
              <span className="login-icon">*</span>
              <input
                className={`login-text ${errors.password ? "finput-error" : ""}`}
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
            {errors.password && <span className="error-msg">{errors.password}</span>}
          </div>

        <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
        </form>

        <p className="footer-text login-help">
            <Link to="/forgot-password" className="link">Forgot password?</Link>
        </p>

        <div className="or-line">or</div>

        <p className="footer-text">
            Need an account?{" "}
            <Link to="/signup" className="link">Create one</Link>
        </p>
        <p className="footer-text login-secondary-link">
            Need to verify your email?{" "}
            <Link to="/verify-email/resend" className="link">Resend the link</Link>
        </p>

        {import.meta.env.DEV && (
            <details className="demo-login">
              <summary>Development demo accounts</summary>
              <p>These accounts work locally until the C# API is connected.</p>
              <ul>
                {DEMO_ACCOUNT_HINTS.map((account) => (
                  <li key={account.email}>
                    <strong>{account.role}</strong>: {account.email} / {account.password}
                  </li>
                ))}
              </ul>
            </details>
        )}
      </div>
    </div>
  );
}
