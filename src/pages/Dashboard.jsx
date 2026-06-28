import { useEffect, useState } from "react";
import { useToast } from "../lib/useToast";
import { supabase } from "../lib/supabase";
import { fetchExchangeRates, convertCurrency, getCurrencySymbol } from "../lib/currencyUtils";
import { getFrequencyLabel, getNextOccurrenceDate } from "../lib/recurringTransactions";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar } from "recharts";

const CAT_COLORS = { Food:"#E24B4A", Transport:"#D85A30", Rent:"#BA7517", Salary:"#1D9E75", Shopping:"#D4537E", Entertainment:"#7F77DD", Health:"#378ADD", default:"#888780" };
const PIE_COLORS = ["#7F77DD","#D4537E","#E24B4A","#D85A30","#378ADD","#BA7517","#1D9E75"];
const today = new Date().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
const THIS_MONTH = new Date().toISOString().slice(0, 7);
const MONTH_LABEL = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function Dashboard() {
  const { success, error: toastError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("month");
  const [userCurrency, setUserCurrency] = useState("USD");
  const [rates, setRates] = useState({});
  const [savingsTarget, setSavingsTarget] = useState(20);

  useEffect(() => {
    const loadAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserCurrency(user?.user_metadata?.currency || "USD");
      setSavingsTarget(Number(user?.user_metadata?.savings_goal) || 20);
      const fetchedRates = await fetchExchangeRates("USD");
      setRates(fetchedRates);
      const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
      if (!error) setTransactions(data || []);
      setLoading(false);
    };
    loadAll();
  }, []);

  const fmt = (n) => getCurrencySymbol(userCurrency) + Number(n).toLocaleString(undefined, { minimumFractionDigits:0, maximumFractionDigits:0 });
  const cvt = (amt) => convertCurrency(amt, "USD", userCurrency, rates);

  const scopedTxs = viewMode === "month"
    ? transactions.filter((t) => t.created_at?.slice(0, 7) === THIS_MONTH)
    : transactions;

  const income = scopedTxs.filter((t) => t.type === "income").reduce((a, t) => a + cvt(t.amount), 0);
  const expenses = scopedTxs.filter((t) => t.type === "expense").reduce((a, t) => a + cvt(t.amount), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0;
  const expenseTxs = scopedTxs.filter((t) => t.type === "expense");

  const categoryTotals = {};
  expenseTxs.forEach((t) => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + cvt(t.amount); });
  const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const totalExp = sortedCats.reduce((a, [, v]) => a + v, 0) || 1;

  const pieData = sortedCats.map(([cat, amt]) => ({ name: cat, value: Math.round((amt / totalExp) * 100) }));
  const barData = sortedCats.slice(0, 6).map(([cat, amt]) => ({ name: cat, amount: Math.round(amt) }));

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });

  const chartData = last6Months.map((ym) => {
    const monthTxs = transactions.filter((t) => t.created_at?.slice(0, 7) === ym);
    const inc = monthTxs.filter((t) => t.type === "income").reduce((a, t) => a + cvt(t.amount), 0);
    const exp = monthTxs.filter((t) => t.type === "expense").reduce((a, t) => a + cvt(t.amount), 0);
    return { name: ym.slice(5), income: Math.round(inc), expenses: Math.round(exp), net: Math.round(inc - exp) };
  });

  const filteredTxs = scopedTxs.filter((t) => filter === "all" ? true : t.type === filter);

  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      success("Transaction deleted");
    } catch (err) {
      toastError("Failed to delete transaction");
    }
  };

  const addTransaction = async () => {
    const amt = parseFloat(amount);
    if (!category.trim() || !amt || amt <= 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("transactions")
        .insert([{ user_id: user.id, type, category: category.trim(), amount: amt, note: "", original_currency: userCurrency }])
        .select()
        .single();
      if (error) throw error;
      setTransactions((prev) => [data, ...prev]);
      success("Transaction added");
      setCategory("");
      setAmount("");
    } catch (err) {
      toastError("Failed to add transaction");
    }
  };

  // CSV EXPORT
  const exportToCSV = () => {
    try {
      const headers = ["Date", "Type", "Category", "Amount", "Note", "Currency"];
      const rows = filteredTxs.map((t) => [
        new Date(t.created_at).toLocaleDateString(),
        t.type,
        t.category,
        t.amount,
        t.note || "",
        t.original_currency || "USD"
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      success("Exported to CSV");
    } catch (err) {
      toastError("Failed to export");
    }
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topbar}>
          <div style={s.pageTitle}>Dashboard</div>
          <div style={s.datePill}>{today}</div>
        </div>

        <div style={s.grid4}>
          {[
            { label: "Balance", value: fmt(Math.abs(balance)), sub: balance >= 0 ? "positive" : "overspent", color: balance >= 0 ? "#1D9E75" : "#E24B4A", icon: "💼" },
            { label: "Income", value: fmt(income), sub: `${scopedTxs.filter((t) => t.type === "income").length} sources`, color: "#1D9E75", icon: "⬇️" },
            { label: "Expenses", value: fmt(expenses), sub: `${expenseTxs.length} items`, color: "#E24B4A", icon: "⬆️" },
            { label: "Savings rate", value: `${savingsRate}%`, sub: savingsRate >= savingsTarget ? "on track" : "save more", color: "#7F77DD", icon: "📊" },
          ].map((m) => (
            <div key={m.label} style={{ ...s.mcard, borderLeft: `3px solid ${m.color}` }}>
              <div style={{ fontSize: 16, marginBottom: 8 }}>{m.icon}</div>
              <div style={s.mLabel}>{m.label}</div>
              <div style={{ ...s.mVal, color: m.color }}>{m.value}</div>
              <div style={s.mSub}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div style={s.cols}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={s.panel}>
              <div style={s.panelHd}>New transaction</div>
              <div style={s.seg}>
                {["expense", "income"].map((t) => (
                  <button key={t} onClick={() => setType(t)} style={{ ...s.segBtn, ...(type === t ? s.segBtnActive : {}) }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <input style={s.input} placeholder="Category (e.g. Rent)" value={category} onChange={(e) => setCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTransaction()} />
              <input style={s.input} type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTransaction()} />
              <button style={s.addBtn} onClick={addTransaction}>+ Add transaction</button>
            </div>

            {barData.length > 0 && (
              <div style={s.panel}>
                <div style={s.panelHd}>Top expenses</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "0.5px solid #334155" }} />
                    <Bar dataKey="amount" fill="#E24B4A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div style={s.panel}>
                <div style={s.panelHd}>Spending by category</div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} ${value}%`} outerRadius={70} fill="#8884d8" dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e293b", border: "0.5px solid #334155" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartData.length > 0 && (
              <div style={s.panel}>
                <div style={s.panelHd}>6-month trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#1e293b", border: "0.5px solid #334155" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="income" stroke="#1D9E75" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" stroke="#E24B4A" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={s.panel}>
            <div style={{ ...s.panelHd, justifyContent: "space-between", marginBottom: 10 }}>
              <span>Transactions</span>
              <button style={s.exportBtn} onClick={exportToCSV}>⬇ Export CSV</button>
            </div>
            <div style={s.viewToggle}>
              {["month", "alltime"].map((v) => (
                <button key={v} onClick={() => setViewMode(v)} style={{ ...s.viewBtn, ...(viewMode === v ? s.viewBtnActive : {}) }}>
                  {v === "month" ? "This month" : "All time"}
                </button>
              ))}
            </div>
            <div style={s.filterRow}>
              {["all", "income", "expense"].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div style={s.txList}>
              {loading ? <div style={s.empty}>Loading...</div> : filteredTxs.length === 0 ? (
                <div style={s.empty}>{viewMode === "month" ? "No transactions this month yet." : "No transactions yet."}</div>
              ) : filteredTxs.map((t) => {
                const isExp = t.type === "expense";
                const dotClr = CAT_COLORS[t.category] || CAT_COLORS.default;
                const amtClr = isExp ? "#E24B4A" : "#1D9E75";
                const dateStr = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const nextDate = t.is_recurring ? getNextOccurrenceDate(t.created_at, t.frequency) : null;
                
                return (
                  <div key={t.id} style={s.txRow}>
                    <div style={s.txLeft}>
                      <div style={{ ...s.txDot, background: dotClr }} />
                      <div>
                        <div style={s.txCat}>{t.category}</div>
                        <div style={s.txType}>
                          {t.type} · {dateStr}
                          {t.is_recurring && <span style={{ color: "#7F77DD", fontWeight: 500, marginLeft: 6 }}>🔄 {getFrequencyLabel(t.frequency)}</span>}
                        </div>
                        {t.is_recurring && nextDate && <div style={{ fontSize: 10, color: "#378ADD", marginTop: 2 }}>Next: {nextDate}</div>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ ...s.txAmt, color: amtClr }}>{isExp ? "-" : "+"}{fmt(cvt(t.amount))}</div>
                      <button onClick={() => deleteTransaction(t.id)} style={s.deleteBtn}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
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
  datePill: { fontSize: 12, color: "#64748b", background: "#1e293b", border: "0.5px solid #334155", borderRadius: 20, padding: "5px 12px" },
  viewToggle: { display: "flex", background: "#0b1120", borderRadius: 8, border: "0.5px solid #334155", overflow: "hidden", marginBottom: 12 },
  viewBtn: { padding: "5px 12px", fontSize: 11, fontWeight: 500, border: "none", background: "transparent", color: "#64748b", cursor: "pointer", whiteSpace: "nowrap" },
  viewBtnActive: { background: "#7F77DD", color: "#fff" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: "1.25rem" },
  mcard: { background: "#1e293b", borderRadius: 12, border: "0.5px solid #334155", padding: "14px 16px" },
  mLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 4 },
  mVal: { fontSize: 21, fontWeight: 500, lineHeight: 1 },
  mSub: { fontSize: 11, color: "#64748b", marginTop: 5 },
  cols: { display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 14 },
  panel: { background: "#1e293b", borderRadius: 12, border: "0.5px solid #334155", padding: 16 },
  panelHd: { fontSize: 11, fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" },
  seg: { display: "flex", background: "#0b1120", borderRadius: 8, border: "0.5px solid #334155", overflow: "hidden", marginBottom: 8 },
  segBtn: { flex: 1, padding: "7px", fontSize: 12, fontWeight: 500, border: "none", background: "transparent", color: "#64748b", cursor: "pointer" },
  segBtnActive: { background: "#7F77DD", color: "#fff", borderRadius: 7 },
  input: { width: "100%", marginBottom: 8, padding: "8px 10px", borderRadius: 8, border: "0.5px solid #475569", background: "#0b1120", color: "white", fontSize: 13, outline: "none" },
  addBtn: { width: "100%", padding: 9, background: "#7F77DD", color: "#fff", fontSize: 13, fontWeight: 500, border: "none", borderRadius: 8, cursor: "pointer" },
  exportBtn: { padding: "4px 10px", fontSize: 11, fontWeight: 500, border: "0.5px solid #334155", borderRadius: 6, background: "transparent", color: "#64748b", cursor: "pointer" },
  filterRow: { display: "flex", gap: 6, marginBottom: 12 },
  filterBtn: { padding: "4px 12px", fontSize: 11, fontWeight: 500, border: "0.5px solid #334155", borderRadius: 20, background: "transparent", color: "#64748b", cursor: "pointer" },
  filterBtnActive: { background: "#7F77DD", color: "#fff", border: "0.5px solid #7F77DD" },
  txList: { display: "flex", flexDirection: "column", gap: 5, maxHeight: 340, overflowY: "auto" },
  txRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 8, background: "#0b1120", border: "0.5px solid #334155" },
  txLeft: { display: "flex", alignItems: "center", gap: 9 },
  txDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  txCat: { fontSize: 13, fontWeight: 500, color: "#f1f5f9" },
  txType: { fontSize: 11, color: "#64748b" },
  txAmt: { fontSize: 13, fontWeight: 500 },
  deleteBtn: { background: "transparent", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", padding: "2px 5px", borderRadius: 4 },
  empty: { textAlign: "center", padding: "2rem", color: "#64748b", fontSize: 13 },
};