import T from "../lib/theme";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

const links = [
  { to: "/dashboard",    label: "Dashboard",    icon: "⊞" },
  { to: "/transactions", label: "Transactions", icon: "↕" },
  { to: "/budgets",      label: "Budgets",      icon: "◎" },
  { to: "/goals",        label: "Goals",        icon: "◈" },
  { to: "/analytics",    label: "Analytics",    icon: "∿" },
  { to: "/settings",     label: "Settings",     icon: "⚙" },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

export default function Navbar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";

  // ── MOBILE: bottom tab bar ──────────────────────────────────────────────
  if (isMobile) {
    // Show 5 tabs: first 4 links + settings. Transactions gets its own spot.
    const tabLinks = [
      { to: "/dashboard",    label: "Home",    icon: "⊞" },
      { to: "/transactions", label: "Txns",    icon: "↕" },
      { to: "/budgets",      label: "Budgets", icon: "◎" },
      { to: "/goals",        label: "Goals",   icon: "◈" },
      { to: "/analytics",    label: "More",    icon: "∿" },
    ];

    return (
      <nav style={m.bar}>
        {tabLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...m.tab,
              ...(isActive ? m.tabActive : {}),
            })}
          >
            <span style={m.tabIcon}>{icon}</span>
            <span style={m.tabLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  // ── DESKTOP: sidebar ────────────────────────────────────────────────────
  return (
    <nav style={s.nav}>
      <div style={s.logo}>
        Budget<span style={{ color: T.brand.primary }}>IQ</span>
      </div>

      <div style={s.links}>
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({ ...s.link, ...(isActive ? s.linkActive : {}) })}
          >
            <span style={s.icon}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <div style={s.bottom}>
        <div style={s.userRow}>
          <div style={s.avatar}>{name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={s.userName}>{name}</div>
            <div style={s.userEmail}>{email}</div>
          </div>
        </div>
        <button style={s.logout} onClick={handleLogout}>⇤ Logout</button>
      </div>
    </nav>
  );
}

// Desktop sidebar styles
const s = {
  nav:       { width: 220, minHeight: "100vh", background: T.bg.surface, borderRight: `1px solid ${T.bg.border}`, display: "flex", flexDirection: "column", padding: "24px 16px", position: "sticky", top: 0, flexShrink: 0 },
  logo:      { fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", color: T.color.white, marginBottom: 32, paddingLeft: 8 },
  links:     { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  link:      { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: T.text.secondary, textDecoration: "none" },
  linkActive:{ background: T.bg.elevated, color: T.text.primary },
  icon:      { fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 },
  bottom:    { marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 },
  userRow:   { display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 8, background: T.bg.elevated, border: `1px solid ${T.bg.border}` },
  avatar:    { width: 30, height: 30, borderRadius: "50%", background: T.brand.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: T.color.white, flexShrink: 0 },
  userName:  { fontSize: 12, fontWeight: 500, color: T.text.primary },
  userEmail: { fontSize: 10, color: T.text.secondary, marginTop: 1 },
  logout:    { padding: "9px 12px", background: "transparent", border: `1px solid ${T.bg.border}`, borderRadius: 8, color: T.text.secondary, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "100%" },
};

// Mobile bottom tab bar styles
const m = {
  bar:      { position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: T.bg.surface, borderTop: `1px solid ${T.bg.border}`, display: "flex", alignItems: "stretch", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" },
  tab:      { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, textDecoration: "none", color: T.text.secondary, fontSize: 10, fontWeight: 500, padding: "8px 0" },
  tabActive:{ color: T.brand.primary },
  tabIcon:  { fontSize: 18, lineHeight: 1 },
  tabLabel: { fontSize: 10, fontWeight: 500 },
};