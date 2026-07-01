import T from "../lib/theme";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div style={s.page}>
      {/* NAVBAR */}
      <nav style={s.navbar}>
        <div style={s.navContainer}>
          <div style={s.logo}>Budget<span style={{ color: T.brand.primary }}>IQ</span></div>
          <div style={s.navLinks}>
            <Link to="/" style={s.navLink}>Login</Link>
            <Link to="/register" style={{ ...s.navLink, ...s.registerLink }}>Register</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={s.hero}>
        <div style={s.heroContainer}>
          <div style={s.heroContent}>
            <h1 style={s.heroTitle}>Take Control of Your Money</h1>
            <p style={s.heroSubtitle}>
              Track spending, set budgets, and achieve your savings goals with BudgetIQ. 
              Beautiful, fast, and built for you.
            </p>
            <div style={s.heroCTA}>
              <Link to="/register" style={s.primaryBtn}>Get Started Free</Link>
              <Link to="/" style={s.secondaryBtn}>Sign In</Link>
            </div>
          </div>

          <div style={s.heroVisual}>
            <div style={s.mockupCard}>
              <div style={s.mockupHeader}>
                <div style={s.mockupDot}></div>
                <div style={s.mockupDot}></div>
                <div style={s.mockupDot}></div>
              </div>
              <div style={s.mockupContent}>
                <div style={s.mockupMetric}>
                  <div style={s.mockupLabel}>Balance</div>
                  <div style={s.mockupValue}>$4,200</div>
                </div>
                <div style={s.mockupMetric}>
                  <div style={s.mockupLabel}>Income</div>
                  <div style={s.mockupValue}>$5,100</div>
                </div>
                <div style={s.mockupMetric}>
                  <div style={s.mockupLabel}>Expenses</div>
                  <div style={s.mockupValue}>$900</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={s.features}>
        <div style={s.featuresContainer}>
          <h2 style={s.featuresTitle}>Powerful Features</h2>
          <div style={s.featureGrid}>
            {[
              {
                icon: "💳",
                title: "Track Every Transaction",
                desc: "Log income and expenses instantly. Organize by category and add notes.",
              },
              {
                icon: "💰",
                title: "Smart Budgets",
                desc: "Set monthly limits per category. Get alerts when you're close to the limit.",
              },
              {
                icon: "🎯",
                title: "Savings Goals",
                desc: "Create goals and track progress. Know exactly how far you are from your target.",
              },
              {
                icon: "📊",
                title: "Live Analytics",
                desc: "Visual breakdowns of spending. Insights to help you make better decisions.",
              },
              {
                icon: "🌍",
                title: "Multi-Currency",
                desc: "USD, EUR, GBP, NGN. Real-time exchange rates. All conversions automatic.",
              },
              {
                icon: "🔒",
                title: "100% Secure",
                desc: "Your data is yours. End-to-end encrypted. No ads, no tracking.",
              },
            ].map((feature, i) => (
              <div key={i} style={s.featureCard}>
                <div style={s.featureIcon}>{feature.icon}</div>
                <h3 style={s.featureTitle}>{feature.title}</h3>
                <p style={s.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={s.cta}>
        <div style={s.ctaContainer}>
          <h2 style={s.ctaTitle}>Start Managing Your Money Today</h2>
          <p style={s.ctaSubtitle}>Join thousands taking control of their finances</p>
          <Link to="/register" style={s.primaryBtn}>Create Free Account</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={s.footer}>
        <div style={s.footerContainer}>
          <div style={s.footerLogo}>Budget<span style={{ color: T.brand.primary }}>IQ</span></div>
          <div style={s.footerLinks}>
            <a href="#" style={s.footerLink}>Privacy</a>
            <a href="#" style={s.footerLink}>Terms</a>
            <a href="#" style={s.footerLink}>Contact</a>
          </div>
          <div style={s.footerCopy}>© 2026 BudgetIQ. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

const s = {
  page: { background: T.bg.base, color: T.color.white, fontFamily: "sans-serif", minHeight: "100vh" },

  // NAVBAR
  navbar: { background: T.bg.surface, borderBottom: `1px solid ${T.bg.border}`, position: "sticky", top: 0, zIndex: 100 },
  navContainer: { maxWidth: "1200px", margin: "0 auto", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" },
  navLinks: { display: "flex", gap: 16, alignItems: "center" },
  navLink: { fontSize: 13, fontWeight: 500, color: T.text.secondary, textDecoration: "none" },
  registerLink: { padding: "8px 16px", background: T.brand.primary, color: T.color.white, borderRadius: 6 },

  // HERO
  hero: { padding: "80px 20px", background: T.bg.base },
  heroContainer: { maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 60, alignItems: "center" },
  heroContent: {},
  heroTitle: { fontSize: 48, fontWeight: 700, lineHeight: 1.2, marginBottom: 20, color: T.text.primary },
  heroSubtitle: { fontSize: 16, color: T.text.subtle, lineHeight: 1.6, marginBottom: 32, maxWidth: 500 },
  heroCTA: { display: "flex", gap: 16 },
  primaryBtn: { padding: "12px 28px", background: T.brand.primary, color: T.color.white, textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, display: "inline-block", transition: "background 0.2s" },
  secondaryBtn: { padding: "12px 28px", background: "transparent", border: `1px solid ${T.bg.border}`, color: T.text.subtle, textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 14, display: "inline-block", transition: "all 0.2s" },
  heroVisual: { display: "flex", justifyContent: "center" },
  mockupCard: { background: T.bg.surface, border: `1px solid ${T.bg.border}`, borderRadius: 12, padding: 20, width: "100%", maxWidth: 320 },
  mockupHeader: { display: "flex", gap: 8, marginBottom: 20 },
  mockupDot: { width: 8, height: 8, borderRadius: "50%", background: T.bg.border },
  mockupContent: { display: "flex", flexDirection: "column", gap: 12 },
  mockupMetric: { background: T.bg.base, padding: 12, borderRadius: 8 },
  mockupLabel: { fontSize: 11, color: T.text.secondary, marginBottom: 4, textTransform: "uppercase", fontWeight: 500 },
  mockupValue: { fontSize: 20, fontWeight: 600, color: T.color.income },

  // FEATURES
  features: { padding: "80px 20px", background: T.bg.base },
  featuresContainer: { maxWidth: "1200px", margin: "0 auto" },
  featuresTitle: { fontSize: 36, fontWeight: 700, marginBottom: 50, textAlign: "center", color: T.text.primary },
  featureGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 },
  featureCard: { background: T.bg.surface, border: `1px solid ${T.bg.border}`, borderRadius: 12, padding: 28, textAlign: "center" },
  featureIcon: { fontSize: 40, marginBottom: 16 },
  featureTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: T.text.primary },
  featureDesc: { fontSize: 13, color: T.text.subtle, lineHeight: 1.6 },

  // CTA
  cta: { padding: "80px 20px", background: "linear-gradient(135deg, #7F77DD 0%, #5a52a8 100%)" },
  ctaContainer: { maxWidth: "600px", margin: "0 auto", textAlign: "center" },
  ctaTitle: { fontSize: 36, fontWeight: 700, marginBottom: 12, color: T.color.white },
  ctaSubtitle: { fontSize: 16, color: T.color.whiteDim, marginBottom: 32 },

  // FOOTER
  footer: { padding: "40px 20px", borderTop: `1px solid ${T.bg.border}`, background: T.bg.surface },
  footerContainer: { maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 },
  footerLogo: { fontSize: 16, fontWeight: 600 },
  footerLinks: { display: "flex", gap: 24 },
  footerLink: { fontSize: 13, color: T.text.secondary, textDecoration: "none" },
  footerCopy: { fontSize: 12, color: T.text.muted, width: "100%", textAlign: "center", marginTop: 20 },
};