import { useEffect, useState } from "react";
import { useToast } from "../lib/useToast";
import { supabase } from "../lib/supabase";
import { fetchExchangeRates, convertCurrency, formatDualCurrency, getCurrencySymbol } from "../lib/currencyUtils";
import { getFrequencyLabel, getNextOccurrenceDate, createNextRecurrence } from "../lib/recurringTransactions";

const CAT_COLORS = {
  Food: "#E24B4A", Transport: "#D85A30", Rent: "#BA7517", Salary: "#1D9E75", Shopping: "#D4537E",
  Entertainment: "#7F77DD", Health: "#378ADD", default: "#888780",
};

const CATEGORIES = [
  "Food", "Transport", "Rent", "Salary", "Shopping", "Entertainment", "Health", "Freelance", "Other",
];

export default function Transactions() {
  const { success, error: toastError } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterTime, setFilterTime] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Currency state
  const [userCurrency, setUserCurrency] = useState("USD");
  const [rates, setRates] = useState({});

  // Undo state
  const [deletedTx, setDeletedTx] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState("monthly");
  const [recurringEndDate, setRecurringEndDate] = useState("");

  // LOAD USER CURRENCY & EXCHANGE RATES
  useEffect(() => {
    const loadCurrencyAndRates = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.currency) {
          setUserCurrency(user.user_metadata.currency);
        }
        const fetchedRates = await fetchExchangeRates("USD");
        setRates(fetchedRates);
      } catch (err) {
        console.error("Currency/rates error:", err);
      }
    };
    loadCurrencyAndRates();
  }, []);

  // FETCH TRANSACTIONS
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setTransactions(data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, []);

  // ADD TRANSACTION
  const addTransaction = async () => {
    const amt = parseFloat(amount);
    const cat = category === "Other" ? customCat.trim() : category;
    if (!cat || !amt || amt <= 0) return;
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("transactions")
        .insert([{
          user_id: user.id,
          type,
          category: cat,
          amount: amt,
          note: note.trim(),
          original_currency: userCurrency,
          is_recurring: isRecurring,
          frequency: isRecurring ? frequency : null,
          recurring_end_date: isRecurring && recurringEndDate ? recurringEndDate : null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (isRecurring && data) {
        await createNextRecurrence(data);
      }

      setTransactions((prev) => [data, ...prev]);
      success("Transaction added");
      setCategory("");
      setCustomCat("");
      setAmount("");
      setNote("");
      setIsRecurring(false);
      setFrequency("monthly");
      setRecurringEndDate("");
    } catch (err) {
      toastError("Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE TRANSACTION WITH UNDO
  const deleteTransaction = async (id) => {
    const tx = transactions.find(t => t.id === id);
    setDeletedTx(tx);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    success("Transaction deleted (undo in 5s)");

    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(async () => {
      try {
        await supabase.from("transactions").delete().eq("id", id);
        setDeletedTx(null);
      } catch (err) {
        console.error("Permanent delete error:", err);
      }
    }, 5000);
    
    setUndoTimer(timer);
  };

  // UNDO DELETE
  const undoDelete = async () => {
    if (!deletedTx) return;
    if (undoTimer) clearTimeout(undoTimer);
    
    try {
      const { error } = await supabase
        .from("transactions")
        .insert([deletedTx]);
      
      if (error) throw error;
      setTransactions((prev) => [deletedTx, ...prev]);
      setDeletedTx(null);
      success("Transaction restored");
    } catch (err) {
      toastError("Failed to restore transaction");
    }
  };

  // EDIT TRANSACTION
  const editTransaction = async (id) => {
    if (!editData.amount || !editData.category) return;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(editData.amount),
          category: editData.category,
          note: editData.note || "",
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      setTransactions((prev) => prev.map((t) => t.id === id ? data : t));
      success("Transaction updated");
      setEditId(null);
      setEditData({});
    } catch (err) {
      toastError("Failed to update transaction");
    }
  };

  // FILTER + SORT
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisWeek = new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10);

  const visible = transactions
    .filter((t) => filterType === "all" || t.type === filterType)
    .filter((t) => filterCat === "all" || t.category === filterCat)
    .filter((t) => {
      if (filterTime === "month") return t.created_at?.slice(0, 7) === thisMonth;
      if (filterTime === "week") return t.created_at?.slice(0, 10) >= thisWeek;
      return true;
    })
    .filter((t) => t.category.toLowerCase().includes(search.toLowerCase()) ||
      (t.note || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "highest") return b.amount - a.amount;
      if (sortBy === "lowest") return a.amount - b.amount;
      return 0;
    });

  // SUMMARY STATS
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((a, t) => {
      const txCurrency = t.original_currency || "USD";
      return a + convertCurrency(t.amount, txCurrency, userCurrency, rates);
    }, 0);
    
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((a, t) => {
      const txCurrency = t.original_currency || "USD";
      return a + convertCurrency(t.amount, txCurrency, userCurrency, rates);
    }, 0);

  const uniqueCats = [...new Set(transactions.map((t) => t.category))];
  const fmt = (n) => getCurrencySymbol(userCurrency) + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* UNDO NOTIFICATION */}
        {deletedTx && (
          <div style={s.undoBar}>
            <span>Transaction deleted</span>
            <button style={s.undoBtn} onClick={undoDelete}>Undo</button>
          </div>
        )}

        {/* HEADER */}
        <div style={s.topbar}>
          <div style={s.pageTitle}>Transactions</div>
          <div style={s.countPill}>{transactions.length} total • {userCurrency}</div>
        </div>

        {/* SUMMARY ROW */}
        <div style={s.summaryRow}>
          <div style={s.summaryCard}>
            <div style={s.sLabel}>Total income</div>
            <div style={{ ...s.sVal, color: "#1D9E75" }}>{fmt(totalIncome)}</div>
          </div>
          <div style={s.summaryCard}>
            <div style={s.sLabel}>Total expenses</div>
            <div style={{ ...s.sVal, color: "#E24B4A" }}>{fmt(totalExpenses)}</div>
          </div>
          <div style={s.summaryCard}>
            <div style={s.sLabel}>Net balance</div>
            <div style={{
              ...s.sVal,
              color: totalIncome - totalExpenses >= 0 ? "#1D9E75" : "#E24B4A"
            }}>
              {fmt(Math.abs(totalIncome - totalExpenses))}
            </div>
          </div>
          <div style={s.summaryCard}>
            <div style={s.sLabel}>Showing</div>
            <div style={{ ...s.sVal, color: "#7F77DD" }}>{visible.length}</div>
          </div>
        </div>

        <div style={s.cols}>

          {/* ADD FORM */}
          <div style={s.panel}>
            <div style={s.panelHd}>New transaction</div>

            <div style={s.seg}>
              {["expense", "income"].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{ ...s.segBtn, ...(type === t ? s.segBtnActive : {}) }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div style={s.fieldLabel}>Category</div>
            <select
              style={s.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {category === "Other" && (
              <input
                style={s.input}
                placeholder="Enter category name"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
              />
            )}

            <div style={s.fieldLabel}>Amount ({userCurrency})</div>
            <input
              style={s.input}
              type="number"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTransaction()}
            />

            <div style={s.fieldLabel}>Note (optional)</div>
            <input
              style={s.input}
              placeholder="e.g. Monthly groceries"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {/* RECURRING TOGGLE */}
            <div style={s.recurringSection}>
              <label style={s.recurringLabel}>
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  style={{ marginRight: 8, cursor: "pointer" }}
                />
                Make this recurring?
              </label>
            </div>

            {/* RECURRING OPTIONS */}
            {isRecurring && (
              <div style={s.recurringOptions}>
                <div style={s.fieldLabel}>Frequency</div>
                <select
                  style={s.input}
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <div style={s.fieldLabel}>End date (optional)</div>
                <input
                  style={s.input}
                  type="date"
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                />
              </div>
            )}

            <button
              style={{ ...s.addBtn, opacity: submitting ? 0.6 : 1 }}
              onClick={addTransaction}
              disabled={submitting}
            >
              {submitting ? "Adding..." : "+ Add transaction"}
            </button>
          </div>

          {/* LIST */}
          <div style={s.panel}>
            <div style={s.panelHd}>All transactions</div>

            {/* SEARCH */}
            <input
              style={{ ...s.input, marginBottom: 10 }}
              placeholder="Search by category or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* FILTERS */}
            <div style={s.filterRow}>
              {["all", "income", "expense"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  style={{ ...s.filterBtn, ...(filterType === f ? s.filterBtnActive : {}) }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* TIME FILTER */}
            <div style={s.filterRow}>
              {["all", "month", "week"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterTime(f)}
                  style={{ ...s.filterBtn, ...(filterTime === f ? s.filterBtnActive : {}) }}
                >
                  {f === "all" ? "All time" : f === "month" ? "This month" : "This week"}
                </button>
              ))}
            </div>

            {/* CATEGORY FILTER */}
            <div style={{ ...s.filterRow, marginBottom: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setFilterCat("all")}
                style={{ ...s.filterBtn, ...(filterCat === "all" ? s.filterBtnActive : {}) }}
              >
                All categories
              </button>
              {uniqueCats.map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  style={{ ...s.filterBtn, ...(filterCat === c ? s.filterBtnActive : {}) }}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* SORT */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>Sort:</span>
              <select
                style={{ ...s.input, marginBottom: 0, width: "auto", fontSize: 11, padding: "4px 8px" }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest amount</option>
                <option value="lowest">Lowest amount</option>
              </select>
            </div>

            {/* TX LIST */}
            <div style={s.txList}>
              {loading ? (
                <div style={s.empty}>Loading...</div>
              ) : visible.length === 0 ? (
                <div style={s.empty}>No transactions match your filters.</div>
              ) : (
                visible.map((t) => {
                  const isExp = t.type === "expense";
                  const dotClr = CAT_COLORS[t.category] || CAT_COLORS.default;
                  const amtClr = isExp ? "#E24B4A" : "#1D9E75";
                  const txCurrency = t.original_currency || "USD";
                  const displayAmount = formatDualCurrency(t.amount, txCurrency, userCurrency, rates);
                  const nextDate = t.is_recurring ? getNextOccurrenceDate(t.created_at, t.frequency) : null;
                  
                  return editId === t.id ? (
                    <div key={t.id} style={s.txEditRow}>
                      <select
                        style={{ ...s.input, marginBottom: 0, flex: 1, fontSize: 12, padding: "4px 8px" }}
                        value={editData.category || t.category}
                        onChange={(e) => setEditData({...editData, category: e.target.value})}
                      >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        style={{ ...s.input, marginBottom: 0, flex: 1, fontSize: 12, padding: "4px 8px" }}
                        type="number"
                        value={editData.amount || t.amount}
                        onChange={(e) => setEditData({...editData, amount: e.target.value})}
                      />
                      <button style={s.editConfirm} onClick={() => editTransaction(t.id)}>✓</button>
                      <button style={s.editCancel} onClick={() => { setEditId(null); setEditData({}); }}>✕</button>
                    </div>
                  ) : (
                    <div key={t.id} style={s.txRow}>
                      <div style={s.txLeft}>
                        <div style={{ ...s.txDot, background: dotClr }} />
                        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEditId(t.id); setEditData({ category: t.category, amount: t.amount, note: t.note }); }}>
                          <div style={s.txCat}>{t.category}</div>
                          <div style={s.txMeta}>
                            {t.type}
                            {t.note ? ` · ${t.note}` : ""}
                            {t.is_recurring && <span style={s.recurringBadge}> 🔄 {getFrequencyLabel(t.frequency)}</span>}
                          </div>
                          {t.is_recurring && nextDate && (
                            <div style={s.nextDate}>Next: {nextDate}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ ...s.txAmt, color: amtClr, fontSize: 12 }}>
                          {isExp ? "-" : "+"}{displayAmount}
                        </div>
                        <button
                          onClick={() => deleteTransaction(t.id)}
                          style={s.deleteBtn}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
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
  undoBar: { background: "rgba(29,158,117,0.12)", border: "0.5px solid #1D9E75", color: "#1D9E75", padding: "10px 14px", borderRadius: 8, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 },
  undoBtn: { padding: "4px 12px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 500 },
  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" },
  pageTitle: { fontSize: 18, fontWeight: 500, color: "#f1f5f9" },
  countPill: { fontSize: 12, color: "#64748b", background: "#1e293b", border: "0.5px solid #334155", borderRadius: 20, padding: "5px 12px" },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: "1.25rem" },
  summaryCard: { background: "#1e293b", borderRadius: 12, border: "0.5px solid #334155", padding: "12px 14px" },
  sLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500, marginBottom: 4 },
  sVal: { fontSize: 19, fontWeight: 500 },
  cols: { display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 },
  panel: { background: "#1e293b", borderRadius: 12, border: "0.5px solid #334155", padding: 16 },
  panelHd: { fontSize: 11, fontWeight: 500, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 },
  seg: { display: "flex", background: "#0b1120", borderRadius: 8, border: "0.5px solid #334155", overflow: "hidden", marginBottom: 12 },
  segBtn: { flex: 1, padding: "7px", fontSize: 12, fontWeight: 500, border: "none", background: "transparent", color: "#64748b", cursor: "pointer" },
  segBtnActive: { background: "#7F77DD", color: "#fff", borderRadius: 7 },
  fieldLabel: { fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 500 },
  input: { width: "100%", marginBottom: 10, padding: "8px 10px", borderRadius: 8, border: "0.5px solid #475569", background: "#0b1120", color: "white", fontSize: 13, outline: "none" },
  addBtn: { width: "100%", padding: 9, background: "#7F77DD", color: "#fff", fontSize: 13, fontWeight: 500, border: "none", borderRadius: 8, cursor: "pointer", marginTop: 8 },
  recurringSection: { marginBottom: 10, padding: 10, background: "#0b1120", borderRadius: 8, border: "0.5px solid #334155" },
  recurringLabel: { fontSize: 12, color: "#f1f5f9", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center" },
  recurringOptions: { background: "#0b1120", padding: 12, borderRadius: 8, marginBottom: 12, border: "0.5px solid #475569" },
  filterRow: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  filterBtn: { padding: "4px 10px", fontSize: 11, fontWeight: 500, border: "0.5px solid #334155", borderRadius: 20, background: "transparent", color: "#64748b", cursor: "pointer", whiteSpace: "nowrap" },
  filterBtnActive: { background: "#7F77DD", color: "#fff", border: "0.5px solid #7F77DD" },
  txList: { display: "flex", flexDirection: "column", gap: 5, maxHeight: 420, overflowY: "auto" },
  txRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 8, background: "#0b1120", border: "0.5px solid #334155" },
  txEditRow: { display: "flex", gap: 6, padding: "6px", borderRadius: 8, background: "#0b1120", border: "0.5px solid #334155", marginBottom: 5, alignItems: "center" },
  txLeft: { display: "flex", alignItems: "center", gap: 9, flex: 1 },
  txDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  txCat: { fontSize: 13, fontWeight: 500, color: "#f1f5f9" },
  txMeta: { fontSize: 11, color: "#64748b", marginTop: 1 },
  recurringBadge: { color: "#7F77DD", fontWeight: 500, fontSize: 10 },
  nextDate: { fontSize: 10, color: "#378ADD", marginTop: 2 },
  txAmt: { fontSize: 13, fontWeight: 500 },
  editConfirm: { padding: "4px 8px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 500 },
  editCancel: { padding: "4px 8px", background: "transparent", border: "0.5px solid #334155", color: "#64748b", borderRadius: 6, cursor: "pointer", fontSize: 11 },
  deleteBtn: { background: "transparent", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", padding: "2px 5px", borderRadius: 4 },
  empty: { textAlign: "center", padding: "2rem", color: "#64748b", fontSize: 13 },
};