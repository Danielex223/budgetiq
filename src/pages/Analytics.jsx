import T, { CAT_COLORS, PIE_COLORS } from "../lib/theme";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getCurrencySymbol, convertCurrency, fetchExchangeRates } from "../lib/currencyUtils";
import { useToast } from "../lib/useToast";

const BAR_COLORS = [T.brand.primary, T.color.pink, T.color.expense, T.color.orange, T.color.blue, T.color.warning, T.color.income];

export default function Analytics() {
  const { error: toastError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrency] = useState("USD");
  const [rates, setRates] = useState({});
  const [savingsTarget, setSavingsTarget] = useState(20);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserCurrency(user?.user_metadata?.currency || "USD");
        setSavingsTarget(Number(user?.user_metadata?.savings_goal) || 20);
        const fetchedRates = await fetchExchangeRates("USD");
        setRates(fetchedRates);

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setTransactions(data || []);
      } catch (err) {
        console.error("Fetch error:", err);
        toastError("Failed to load analytics. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const fmt = (n) => getCurrencySymbol(userCurrency) + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const income = transactions.filter((t) => t.type === "income").reduce((a, t) => a + convertCurrency(t.amount, "USD", userCurrency, rates), 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((a, t) => a + convertCurrency(t.amount, "USD", userCurrency, rates), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;

  const expTxs = transactions.filter((t) => t.type === "expense");
  const catTotals = {};
  expTxs.forEach((t) => {
    const converted = convertCurrency(t.amount, "USD", userCurrency, rates);
    catTotals[t.category] = (catTotals[t.category] || 0) + converted;
  });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const totalExp = sortedCats.reduce((a, [, v]) => a + v, 0) || 1;

  // INCOME BREAKDOWN
  const incTxs = transactions.filter((t) => t.type === "income");
  const incCatTotals = {};
  incTxs.forEach((t) => {
    const converted = convertCurrency(t.amount, "USD", userCurrency, rates);
    incCatTotals[t.category] = (incCatTotals[t.category] || 0) + converted;
  });
  const sortedInc = Object.entries(incCatTotals).sort((a, b) => b[1] - a[1]);
  const totalInc = sortedInc.reduce((a, [, v]) => a + v, 0) || 1;

  // INSIGHTS
  const insights = [];
  if (savingsRate >= savingsTarget) insights.push({ text: `You're saving ${savingsRate}% of your income — great habit.`, color: T.color.income });
  else if (income > 0) insights.push({ text: `Your savings rate is ${savingsRate}%. Aim for at least ${savingsTarget}%.`, color: T.color.warning });
  if (sortedCats[0]) insights.push({ text: `${sortedCats[0][0]} is your biggest expense at ${fmt(sortedCats[0][1])}.`, color: T.brand.primary });
  if (expenses > income && income > 0) insights.push({ text: "You're spending more than you earn this period.", color: T.color.expense });
  if (sortedCats.length >= 4) insights.push({ text: `You have expenses across ${sortedCats.length} categories.`, color: T.color.blue });

  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.topbar}>
          <div style={s.pageTitle}>Analytics</div>
          <div style={s.pill}>{transactions.length} transactions</div>
        </div>

        {/* SUMMARY */}
        <div style={s.summaryRow}>
          {[
            { label: "Total income", val: fmt(income), color: T.color.income },
            { label: "Total expenses", val: fmt(expenses), color: T.color.expense },
            { label: "Net balance", val: fmt(Math.abs(balance)), color: balance >= 0 ? T.color.income : T.color.expense },
            { label: "Savings rate", val: `${savingsRate}%`, color: T.brand.primary },
          ].map((m) => (
            <div key={m.label} style={s.summaryCard}>
              <div style={s.sLabel}>{m.label}</div>
              <div style={{ ...s.sVal, color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* INSIGHTS */}
        {insights.length > 0 && (
          <div style={s.insightsBox}>
            <div style={s.panelHd}>Insights</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insights.map((ins, i) => (
                <div key={i} style={{ ...s.insightRow, borderLeft: `3px solid ${ins.color}` }}>
                  <span style={{ fontSize: 13, color: T.text.subtle }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={s.cols}>

          {/* EXPENSE BREAKDOWN */}
          <div style={s.panel}>
            <div style={s.panelHd}>Expense breakdown</div>
            {loading ? (
              <div style={s.empty}>Loading...</div>
            ) : sortedCats.length === 0 ? (
              <div style={s.empty}>No expense data yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sortedCats.map(([cat, amt], i) => {
                  const pct = Math.round((amt / totalExp) * 100);
                  const clr = BAR_COLORS[i % BAR_COLORS.length];
                  return (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={s.barRow}>
                        <span style={{ color: T.text.primary, fontWeight: 500, fontSize: 13 }}>{cat}</span>
                        <span style={{ color: T.text.secondary, fontSize: 12 }}>{fmt(amt)} · {pct}%</span>
                      </div>
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${pct}%`, background: clr }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INCOME BREAKDOWN */}
          <div style={s.panel}>
            <div style={s.panelHd}>Income breakdown</div>
            {loading ? (
              <div style={s.empty}>Loading...</div>
            ) : sortedInc.length === 0 ? (
              <div style={s.empty}>No income data yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sortedInc.map(([cat, amt], i) => {
                  const pct = Math.round((amt / totalInc) * 100);
                  const clr = [T.color.income, T.brand.primary, T.color.blue][i % 3];
                  return (
                    <div key={cat} style={{ marginBottom: 10 }}>
                      <div style={s.barRow}>
                        <span style={{ color: T.text.primary, fontWeight: 500, fontSize: 13 }}>{cat}</span>
                        <span style={{ color: T.text.secondary, fontSize: 12 }}>{fmt(amt)} · {pct}%</span>
                      </div>
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${pct}%`, background: clr }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* INCOME VS EXPENSE RATIO */}
            {income > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={s.panelHd}>Income vs Expenses</div>
                <div style={s.ratioTrack}>
                  <div style={{ ...s.ratioInc, width: `${Math.round((income / (income + expenses)) * 100)}%` }} />
                  <div style={{ ...s.ratioExp, width: `${Math.round((expenses / (income + expenses)) * 100)}%` }} />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: T.color.income }}>● Income {fmt(income)}</span>
                  <span style={{ color: T.color.expense }}>● Expenses {fmt(expenses)}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: T.bg.base, minHeight: "100vh", color: T.text.primary, fontFamily: "sans-serif" },
  container: { padding: "24px 16px", maxWidth: "960px", margin: "0 auto" },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" },
  pageTitle: { fontSize: 18, fontWeight: 500, color: T.text.primary },
  pill: { fontSize: 12, color: T.text.secondary, background: T.bg.elevated, border: `1px solid ${T.bg.border}`, borderRadius: 20, padding: "5px 12px" },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: "1.25rem" },
  summaryCard: { background: T.bg.surface, borderRadius: 12, border: `1px solid ${T.bg.border}`, padding: "14px 16px" },
  sLabel: { fontSize: 11, color: T.text.secondary, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 6 },
  sVal: { fontSize: 20, fontWeight: 600, color: T.text.primary },
  insightsBox: { background: T.bg.surface, borderRadius: 12, border: `1px solid ${T.bg.border}`, padding: 16, marginBottom: 14 },
  insightRow: { background: T.bg.elevated, borderRadius: 8, padding: "10px 14px", marginBottom: 8 },
  cols: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 },
  panel: { background: T.bg.surface, borderRadius: 12, border: `1px solid ${T.bg.border}`, padding: 18 },
  panelHd: { fontSize: 11, fontWeight: 500, color: T.text.secondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
  barRow: { display: "flex", justifyContent: "space-between", marginBottom: 5 },
  barTrack: { background: T.bg.elevated, borderRadius: 4, height: 7, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" },
  ratioTrack: { display: "flex", height: 10, borderRadius: 6, overflow: "hidden", gap: 2 },
  ratioInc: { background: T.color.income, height: "100%", borderRadius: "6px 0 0 6px", transition: "width 0.5s ease" },
  ratioExp: { background: T.color.expense, height: "100%", borderRadius: "0 6px 6px 0", transition: "width 0.5s ease" },
  empty: { textAlign: "center", padding: "2rem", color: T.text.secondary, fontSize: 13 },
};