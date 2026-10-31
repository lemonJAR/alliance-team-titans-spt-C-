import { useState } from "react";
import { register, verifyStudent } from "../controllers/accountController";
import Logo from "../assets/Logo.png";

const initialForm = {
  email: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  role: "STUDENT",
  password: "",
  confirm_password: "",
  student_id: "",
  employee_id: "",
};

export default function SignUp() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateForm = () => {
    const e = {};
    if (!form.email)
      e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email.";
    if (!form.first_name) e.first_name = "First name is required.";
    if (!form.last_name) e.last_name = "Last name is required.";
        
    if (!form.password)
      e.password = "Password is required.";
    else if (form.password.length < 8)
      e.password = "Minimum 8 characters.";
    if (!form.confirm_password)
      e.confirm_password = "Please confirm your password.";
    else if (form.password !== form.confirm_password)
      e.confirm_password = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

const handleSubmit = async () => {
  if (!validateForm()) return;
  setLoading(true);
  try {
    if (form.role === "STUDENT") {
      const { data } = await verifyStudent(form.student_id);
      if (!data?.exists) {
        setErrors({ student_id: "Student ID not found. Please contact the registrar." });
        return;
      }
    }

    const { student_id, employee_id, ...base } = form;
    const payload = { ...base };
    if (form.role === "STUDENT")   payload.student_id  = student_id;
    if (form.role === "PROFESSOR") payload.employee_id = employee_id;

    await register(payload);
    setDone(true);
  } catch (err) {
    if (err.response?.data) {
      const data = err.response.data;
      const serverErrors = {};
      Object.keys(data).forEach((key) => {
        serverErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
      });
      setErrors(serverErrors);
    } else {
      setErrors({ email: "Unable to connect to the API. Please try again." });
    }
  } finally {
    setLoading(false);
  }
};

  if (done) {
    return (
      <div className="login-shell">
        <div className="card signup-card" style={{ textAlign: "center" }}>
          <img className="brand-logo" src={Logo} alt="Alliance Team Titans logo" />
          <div className="status-icon success" style={{ margin: "0 auto 1.5rem" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6E42" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9-2-2-2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div className="eyebrow">Almost there</div>
          <div className="card-title">Check your inbox<i>.</i></div>
          <div className="card-sub" style={{ marginBottom: "1.5rem" }}>
            We sent a verification link to{" "}
            <strong style={{ color: "var(--moss)" }}>{form.email}</strong>.
            Click it to activate your account.
          </div>
          <a href="/login" className="btn-primary">Go to login</a>
        </div>
      </div>
    );
  }

  return (

      <div className="login-shell">
        <div className="card signup-card">
          <img className="brand-logo" src={Logo} alt="Alliance Team Titans logo" />

          <div className="card-title">
            <>Create your account<i>.</i></>
          </div>

          <div className="card-sub">
            Tell us a little about yourself and set a strong password.
          </div>

          <div className="form">

              <div className="field">
                <label className="flabel">I am a</label>
                <div className="role-group">
                  <button type="button"
                    className={`role-btn ${form.role === "STUDENT" ? "role-active" : ""}`}
                    onClick={() => set("role", "STUDENT")}>
                    🎒 Student
                  </button>
                  <button type="button"
                    className={`role-btn ${form.role === "PROFESSOR" ? "role-active" : ""}`}
                    onClick={() => set("role", "PROFESSOR")}>
                    📖 Teacher
                  </button>
                </div>
              </div>

              <div className="row3">
                <Field label="First name" error={errors.first_name}>
                  <input className={`finput ${errors.first_name ? "finput-error" : ""}`}
                    type="text"
                    value={form.first_name}
                    onChange={(e) => set("first_name", e.target.value)} />
                </Field>

                <Field label="Middle">
                  <input className="finput"
                    type="text"
                    value={form.middle_name}
                    onChange={(e) => set("middle_name", e.target.value)} />
                </Field>

                <Field label="Last name" error={errors.last_name}>
                  <input className={`finput ${errors.last_name ? "finput-error" : ""}`}
                    type="text"
                    value={form.last_name}
                    onChange={(e) => set("last_name", e.target.value)} />
                </Field>
              </div>


              <Field label="Email" error={errors.email}>
                <input className={`finput ${errors.email ? "finput-error" : ""}`}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)} />
              </Field>

              {form.role === "STUDENT" && (
                <Field label="Student ID:" error={errors.student_id}>
                    <input
                    className={`finput ${errors.student_id ? "finput-error" : ""}`}
                    type="text"
                    value={form.student_id || ""}
                    onChange={(e) => set("student_id", e.target.value)}
                    />
                </Field>
                )}

                {form.role === "PROFESSOR" && (
                <Field label="Employee ID:" error={errors.employee_id}>
                    <input
                    className={`finput ${errors.employee_id ? "finput-error" : ""}`}
                    type="text"
                    value={form.employee_id || ""}
                    onChange={(e) => set("employee_id", e.target.value)}
                    />
                </Field>
                )}

              <Field label="Password" error={errors.password}>
                <input className={`finput ${errors.password ? "finput-error" : ""}`}
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)} />
              </Field>

              <Field label="Confirm password" error={errors.confirm_password}>
                <input className={`finput ${errors.confirm_password ? "finput-error" : ""}`}
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => set("confirm_password", e.target.value)} />
              </Field>

              <div className="btn-row">
                <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </div>
            </div>

        </div>
      </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="field">
      <label className="flabel">{label}</label>
      {children}
      {error && <span className="error-msg">{error}</span>}
    </div>
  );
}