import T from "../lib/theme";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/useToast";

export default function Settings() {
  const { success, error: toastError, warning } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [savingsGoal, setSavingsGoal] = useState("20");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // LOAD USER DATA ON MOUNT
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || "");
          setName(user.user_metadata?.name || "User");
          setCurrency(user.user_metadata?.currency || "USD");
          setSavingsGoal(user.user_metadata?.savings_goal || "20");
        }
      } catch (err) {
        console.error("Load user error:", err);
        toastError("Failed to load profile. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // SAVE PROFILE CHANGES
  const handleSave = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name,
          currency,
          savings_goal: savingsGoal,
        },
      });
      if (error) throw error;
      setSaved(true);
      success("Profile saved successfully.");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
      toastError("Failed to save profile. Try again.");
    }
  };

  // CLEAR ALL TRANSACTIONS
  const handleClearTransactions = async () => {
    if (!window.confirm("Delete all transactions? This cannot be undone.")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("transactions").delete().eq("user_id", user.id);
      if (error) throw error;
      success("All transactions deleted.");
    } catch (err) {
      console.error("Delete transactions error:", err);
      toastError("Failed to delete transactions. Try again.");
    }
  };

  // CLEAR ALL BUDGETS
  const handleClearBudgets = async () => {
    if (!window.confirm("Delete all budgets? This cannot be undone.")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("budgets").delete().eq("user_id", user.id);
      if (error) throw error;
      success("All budgets deleted.");
    } catch (err) {
      console.error("Delete budgets error:", err);
      toastError("Failed to delete budgets. Try again.");
    }
  };

  if (loading) return <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;

  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.topbar}>
          <div style={s.pageTitle}>Settings</div>
        </div>

        <div style={s.cols}>

          {/* PROFILE */}
          <div style={s.panel}>
            <div style={s.panelHd}>Profile</div>

            <div style={s.avatar}>
              {name.charAt(0).toUpperCase()}
            </div>

            <div style={s.fieldLabel}>Display name</div>
            <input
              style={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div style={s.fieldLabel}>Email</div>
            <input
              style={s.input}
              type="email"
              value={email}
              disabled
            />

            <div style={s.fieldLabel}>Currency</div>
            <select style={s.input} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="CAD">CAD — Canadian Dollar</option>
              <option value="NGN">NGN — Nigerian Naira</option>
            </select>

            <button style={{ ...s.saveBtn, background: saved ? T.color.income : T.brand.primary }} onClick={handleSave}>
              {saved ? "✓ Saved" : "Save all changes"}
            </button>
            <div style={{ fontSize: 11, color: T.text.muted, textAlign: "center", marginTop: 4 }}>
              Saves profile, currency & savings target
            </div>
          </div>

          {/* PREFERENCES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={s.panel}>
              <div style={s.panelHd}>Finance preferences</div>

              <div style={s.fieldLabel}>Savings rate target (%)</div>
              <input
                style={s.input}
                type="number"
                min="0"
                max="100"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
              />
              <div style={{ fontSize: 12, color: T.text.secondary, marginTop: -6, marginBottom: 12 }}>
                Dashboard will flag when you fall below this target.
              </div>
            </div>

            {/* DANGER ZONE */}
            <div style={{ ...s.panel, border: `1px solid ${T.color.expenseDim}` }}>
              <div style={{ ...s.panelHd, color: T.color.expense }}>Danger zone</div>

              <div style={s.dangerRow}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text.primary }}>Clear all transactions</div>
                  <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 2 }}>
                    Permanently deletes all transaction data.
                  </div>
                </div>
                <button
                  style={s.dangerBtn}
                  onClick={handleClearTransactions}
                >
                  Clear
                </button>
              </div>

              <div style={{ ...s.dangerRow, marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text.primary }}>Clear all budgets</div>
                  <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 2 }}>
                    Removes all budget limits you've set.
                  </div>
                </div>
                <button
                  style={s.dangerBtn}
                  onClick={handleClearBudgets}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ABOUT */}
            <div style={s.panel}>
              <div style={s.panelHd}>About</div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7 }}>
                <div>BudgetIQ v1.0</div>
                <div>Personal finance tracker</div>
                <div style={{ marginTop: 8, color: T.text.muted }}>Built with React + Vite + Supabase</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: T.bg.base, minHeight: "100vh", color: T.color.white, fontFamily: "sans-serif" },
  container: { padding: "24px 16px", maxWidth: "960px", margin: "0 auto" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" },
  pageTitle: { fontSize: 18, fontWeight: 500, color: T.text.primary },
  cols: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14 },
  panel: { background: T.bg.surface, borderRadius: 12, border: `1px solid ${T.bg.border}`, padding: 16 },
  panelHd: { fontSize: 11, fontWeight: 500, color: T.text.secondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
  avatar: { width: 52, height: 52, borderRadius: "50%", background: T.brand.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 500, color: T.color.white, marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: T.text.secondary, marginBottom: 4, fontWeight: 500 },
  input: { width: "100%", marginBottom: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.bg.border}`, background: T.bg.base, color: T.color.white, fontSize: 13, outline: "none" },
  saveBtn: { width: "100%", padding: 9, color: T.color.white, fontSize: 13, fontWeight: 500, border: "none", borderRadius: 8, cursor: "pointer", transition: "background 0.2s" },
  dangerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  dangerBtn: { padding: "6px 14px", background: T.color.expenseDim, border: "0.5px solid rgba(226,75,74,0.4)", color: T.color.expense, fontSize: 12, fontWeight: 500, borderRadius: 8, cursor: "pointer", flexShrink: 0 },
};