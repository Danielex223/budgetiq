import T from "../lib/theme";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/useToast";

export default function Register() {
  const navigate = useNavigate();
  const { error: toastError, warning, success } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password || !confirm) {
      warning("Please fill in all fields.");
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      warning("Passwords do not match.");
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      warning("Password must be at least 6 characters.");
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (err) {
      setError(err.message);
      toastError(err.message);
      setLoading(false);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>Budget<span style={{ color: T.brand.primary }}>IQ</span></div>
        <div style={s.subtitle}>Create your account</div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.fieldLabel}>Full name</div>
        <input style={s.input} placeholder="Daniel Udo" value={name} onChange={(e) => setName(e.target.value)} />

        <div style={s.fieldLabel}>Email</div>
        <input style={s.input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

        <div style={s.fieldLabel}>Password</div>
        <input style={s.input} type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />

        <div style={s.fieldLabel}>Confirm password</div>
        <input
          style={s.input}
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRegister()}
        />

        <button
          style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <div style={s.footer}>
          Already have an account?{" "}
          <Link to="/" style={s.link}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: T.bg.base, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" },
  card: { background: T.bg.surface, border: `1px solid ${T.bg.border}`, borderRadius: 16, padding: "36px 32px", width: "100%", maxWidth: 380 },
  logo: { fontSize: 24, fontWeight: 500, color: T.color.white, letterSpacing: "-0.02em", marginBottom: 6 },
  subtitle: { fontSize: 13, color: T.text.secondary, marginBottom: 24 },
  error: { background: T.color.expenseDim, border: "0.5px solid rgba(226,75,74,0.4)", color: T.color.expense, fontSize: 12, padding: "9px 12px", borderRadius: 8, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: T.text.secondary, fontWeight: 500, marginBottom: 4 },
  input: { width: "100%", marginBottom: 12, padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.bg.border}`, background: T.bg.base, color: T.color.white, fontSize: 13, outline: "none" },
  btn: { width: "100%", padding: 10, background: T.brand.primary, color: T.color.white, fontSize: 14, fontWeight: 500, border: "none", borderRadius: 8, cursor: "pointer", marginTop: 4 },
  footer: { marginTop: 20, fontSize: 12, color: T.text.secondary, textAlign: "center" },
  link: { color: T.brand.primary, textDecoration: "none", fontWeight: 500 },
};