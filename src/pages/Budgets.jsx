import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { fetchExchangeRates, convertCurrency, getCurrencySymbol } from "../lib/currencyUtils";
import { useToast } from "../lib/useToast";

const CATEGORIES = ["Food","Transport","Rent","Shopping","Entertainment","Health","Other"];
const BAR_COLORS = ["#7F77DD","#D4537E","#E24B4A","#D85A30","#378ADD","#BA7517","#1D9E75"];
const THIS_MONTH = new Date().toISOString().slice(0, 7);

export default function Budgets() {
  const { success, error: toastError, warning } = useToast();
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userCurrency, setUserCurrency] = useState("USD");
  const [rates, setRates] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserCurrency(user?.user_metadata?.currency || "USD");
      const fetchedRates = await fetchExchangeRates("USD");
      setRates(fetchedRates);
      const [{ data: b, error: bErr }, { data: t, error: tErr }] = await Promise.all([
        supabase.from("budgets").select("*"),
        supabase.from("transactions").select("*"),
      ]);
      if (bErr || tErr) throw bErr || tErr;
      setBudgets(b || []);
      setTransactions(t || []);
      setLoading(false);
      } catch (err) {
        toastError("Failed to load budgets. Please refresh.");
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (n) => getCurrencySymbol(userCurrency) + Number(n).toLocaleString(undefined, { minimumFractionDigits:0, maximumFractionDigits:0 });
  const cvt = (amt) => convertCurrency(amt, "USD", userCurrency, rates);

  // Only count THIS MONTH's expenses against budget
  const getSpent = (cat) => transactions
    .filter((t) => t.type === "expense" && t.category === cat && t.created_at?.slice(0, 7) === THIS_MONTH)
    .reduce((a, t) => a + cvt(t.amount), 0);

  const getLimit = (limitUSD) => cvt(limitUSD);

  const addBudget = async () => {
    const lmt = parseFloat(limit);
    if (!category) { warning("Please select a category."); return; }
    if (!lmt || lmt <= 0) { warning("Please enter a valid limit amount."); return; }
    if (budgets.find((b) => b.category === category)) { warning(`A budget for ${category} already exists.`); return; }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const limitUSD = convertCurrency(lmt, userCurrency, "USD", rates);
    const { data, error } = await supabase.from("budgets")
      .insert([{ user_id: user.id, category, limit: limitUSD }])
      .select().single();
    if (!error) {
      setBudgets((prev) => [...prev, data]);
      success(`Budget set for ${category}.`);
    } else {
      toastError("Failed to save budget. Try again.");
    }
    setCategory(""); setLimit("");
    setSubmitting(false);
  };

  const deleteBudget = async (id, categoryName) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (!error) {
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      success(`Budget for ${categoryName} removed.`);
    } else {
      toastError("Failed to delete budget. Try again.");
    }
  };

  const totalLimit = budgets.reduce((a, b) => a + getLimit(b.limit), 0);
  const totalSpent = budgets.reduce((a, b) => a + getSpent(b.category), 0);
  const overBudget = budgets.filter((b) => getSpent(b.category) > getLimit(b.limit)).length;
  const nearBudget = budgets.filter((b) => {
    const spent = getSpent(b.category);
    const lim = getLimit(b.limit);
    const pct = lim > 0 ? (spent / lim) * 100 : 0;
    return pct >= 80 && pct < 100;
  }).length;

  // ALERTS — near (80%+) and over
  const alerts = budgets.reduce((acc, b) => {
    const spent = getSpent(b.category);
    const lim = getLimit(b.limit);
    const pct = lim > 0 ? (spent / lim) * 100 : 0;
    if (pct >= 100) acc.push({ cat: b.category, pct: Math.round(pct), type: "over" });
    else if (pct >= 80) acc.push({ cat: b.category, pct: Math.round(pct), type: "warn" });
    return acc;
  }, []);

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topbar}>
          <div style={s.pageTitle}>Budgets</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {nearBudget > 0 && <div style={s.warnPill}>⚠ {nearBudget} near limit</div>}
            <div style={s.pill}>{budgets.length} active</div>
          </div>
        </div>

        {/* ALERTS PANEL */}
        {alerts.length > 0 && (
          <div style={s.alertsBox}>
            <div style={s.alertsHd}>⚠ Budget alerts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {alerts.map((a) => (
                <div key={a.cat} style={{ ...s.alertRow, borderLeft: `3px solid ${a.type === "over" ? "#E24B4A" : "#BA7517"}` }}>
                  <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{a.cat}</span>
                  <span style={{ fontSize: 12, color: a.type === "over" ? "#E24B4A" : "#BA7517", marginLeft: 8 }}>
                    {a.type === "over" ? `Over budget (${a.pct}% used)` : `${a.pct}% used — approaching limit`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div style={s.summaryRow}>
          {[
            { label: "Total budgeted", val: fmt(totalLimit), color: "#7F77DD" },
            { label: "Spent this month", val: fmt(totalSpent), color: "#E24B4A" },
            { label: "Remaining", val: fmt(Math.max(totalLimit - totalSpent, 0)), color: "#1D9E75" },
            { label: "Over budget", val: overBudget, color: overBudget > 0 ? "#E24B4A" : "#1D9E75" },
          ].map((m) => (
            <div key={m.label} style={s.summaryCard}>
              <div style={s.sLabel}>{m.label}</div>
              <div style={{ ...s.sVal, color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>

        <div style={s.cols}>
          {/* SET BUDGET FORM */}
          <div style={s.panel}>
            <div style={s.panelHd}>Set budget</div>
            <div style={s.fieldLabel}>Category</div>
            <select style={s.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select a category</option>
              {CATEGORIES.filter((c) => !budgets.find((b) => b.category === c)).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div style={s.fieldLabel}>Monthly limit ({userCurrency})</div>
            <input style={s.input} type="number" min="0" placeholder="0.00" value={limit}
              onChange={(e) => setLimit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBudget()} />
            <button style={{ ...s.addBtn, opacity: submitting ? 0.6 : 1 }} onClick={addBudget} disabled={submitting}>
              {submitting ? "Saving..." : "+ Set budget"}
            </button>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>
              Budgets track spending for the current month only. Limits are stored in USD and displayed in your currency.
            </div>
          </div>

          {/* BUDGET TRACKER */}
          <div style={s.panel}>
            <div style={s.panelHd}>Budget tracker — {new Date().toLocaleDateString("en-US", { month: "long" })}</div>
            {loading ? <div style={s.empty}>Loading...</div> : budgets.length === 0 ? (
              <div style={s.empty}>No budgets set yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {budgets.map((b, i) => {
                  const spent = getSpent(b.category);
                  const lim = getLimit(b.limit);
                  const rawPct = lim > 0 ? (spent / lim) * 100 : 0;
                  const pct = Math.min(Math.round(rawPct), 100);
                  const over = rawPct >= 100;
                  const warn = rawPct >= 80 && !over;
                  const clr = over ? "#E24B4A" : warn ? "#BA7517" : BAR_COLORS[i % BAR_COLORS.length];

                  return (
                    <div key={b.id} style={s.budgetCard}>
                      <div style={s.budgetTop}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ ...s.dot, background: clr }} />
                          <span style={s.budgetCat}>{b.category}</span>
                          {over && <span style={s.overTag}>over budget</span>}
                          {warn && <span style={s.warnTag}>⚠ {pct}%</span>}
                        </div>
                        <button onClick={() => deleteBudget(b.id, b.category)} style={s.deleteBtn}>✕</button>
                      </div>
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${pct}%`, background: clr }} />
                        {/* 80% marker */}
                        <div style={{ position: "absolute", left: "80%", top: 0, width: 1, height: "100%", background: "#475569", opacity: 0.6 }} />
                      </div>
                      <div style={s.budgetMeta}>
                        <span style={{ color: clr, fontWeight: 500 }}>{fmt(spent)} spent</span>
                        <span style={{ color: "#64748b" }}>of {fmt(lim)} · {pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: "#0b1120", minHeight: "100vh", color: "white", fontFamily: "sans-serif" },
  container: { padding: "24px 20px", maxWidth: "960px", margin: "0 auto" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" },
  pageTitle: { fontSize: 18, fontWeight: 500, color: "#f1f5f9" },
  pill: { fontSize: 12, color: "#64748b", background: "#1e293b", border: "0.5px solid #334155", borderRadius: 20, padding: "5px 12px" },
  warnPill: { fontSize: 12, color: "#BA7517", background: "rgba(186,117,23,0.12)", border: "0.5px solid rgba(186,117,23,0.4)", borderRadius: 20, padding: "5px 12px" },
  alertsBox: { background: "#1e293b", borderRadius: 12, border: "0.5px solid rgba(186,117,23,0.3)", padding: 14, marginBottom: 14 },
  alertsHd: { fontSize: 11, fontWeight: 500, color: "#BA7517", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 },
  alertRow: { background: "#0b1120", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center" },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: "1.25rem" },
  summaryCard: { background: "#1e293b", borderRadius: 12, border: "0.5px solid #334155", padding: "12px 14px" },
  sLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 4 },
  sVal: { fontSize: 19, fontWeight: 500 },
  cols: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 },
  panel: { background: "#1e293b", borderRadius: 12, border: "0.5px solid #334155", padding: 16 },
  panelHd: { fontSize: 11, fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 500 },
  input: { width: "100%", marginBottom: 10, padding: "8px 10px", borderRadius: 8, border: "0.5px solid #475569", background: "#0b1120", color: "white", fontSize: 13, outline: "none" },
  addBtn: { width: "100%", padding: 9, background: "#7F77DD", color: "#fff", fontSize: 13, fontWeight: 500, border: "none", borderRadius: 8, cursor: "pointer" },
  budgetCard: { background: "#0b1120", borderRadius: 10, border: "0.5px solid #334155", padding: "12px 14px" },
  budgetTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  budgetCat: { fontSize: 14, fontWeight: 500, color: "#f1f5f9" },
  overTag: { fontSize: 10, fontWeight: 500, background: "rgba(226,75,74,0.15)", color: "#E24B4A", borderRadius: 20, padding: "2px 8px" },
  warnTag: { fontSize: 10, fontWeight: 500, background: "rgba(186,117,23,0.15)", color: "#BA7517", borderRadius: 20, padding: "2px 8px" },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  barTrack: { background: "#1e293b", borderRadius: 4, height: 7, overflow: "hidden", marginBottom: 8, position: "relative" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" },
  budgetMeta: { display: "flex", justifyContent: "space-between", fontSize: 12 },
  deleteBtn: { background: "transparent", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", padding: "2px 5px", borderRadius: 4 },
  empty: { textAlign: "center", padding: "2rem", color: "#64748b", fontSize: 13 },
};