import T, { CAT_COLORS, PIE_COLORS } from "../lib/theme";
import { useEffect, useState } from "react";
import { useToast } from "../lib/useToast";
import { supabase } from "../lib/supabase";
import { fetchExchangeRates, convertCurrency, formatDualCurrency, getCurrencySymbol } from "../lib/currencyUtils";

const COLORS = [T.brand.primary,T.color.income,T.color.blue,T.color.pink,T.color.warning,T.color.orange];

export default function Goals() {
  const { success, error: toastError } = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [depositId, setDepositId] = useState(null);
  const [depositAmt, setDepositAmt] = useState("");
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState("");

  // Currency state
  const [userCurrency, setUserCurrency] = useState("USD");
  const [rates, setRates] = useState({});

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

  // LOAD GOALS
  useEffect(() => {
    supabase.from("goals").select("*").order("created_at", { ascending:true })
      .then(({ data }) => { setGoals(data || []); setLoading(false); });
  }, []);

  const addGoal = async () => {
    const t = parseFloat(target);
    const sv = parseFloat(saved) || 0;
    if (!name.trim() || !t || t <= 0) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("goals")
        .insert([{ 
          user_id: user.id, 
          name: name.trim(), 
          target: t, 
          saved: sv,
          original_currency: userCurrency,
        }])
        .select()
        .single();
      if (error) throw error;
      setGoals((prev) => [...prev, data]);
      success("Goal created");
      setName(""); setTarget(""); setSaved("");
    } catch (err) {
      toastError("Failed to create goal");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGoal = async (id) => {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      setGoals((prev) => prev.filter((g) => g.id !== id));
      success("Goal deleted");
    } catch (err) {
      toastError("Failed to delete goal");
    }
  };

  const deposit = async (goal) => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt <= 0) return;
    try {
      const newSaved = goal.saved + amt;
      const { data, error } = await supabase
        .from("goals")
        .update({ saved: newSaved })
        .eq("id", goal.id)
        .select()
        .single();
      if (error) throw error;
      setGoals((prev) => prev.map((g) => g.id===goal.id ? data : g));
      success("Savings added");
      setDepositId(null); setDepositAmt("");
    } catch (err) {
      toastError("Failed to add savings");
    }
  };

  const editSaved = async (goalId, newAmount) => {
    const amt = parseFloat(newAmount);
    if (!amt || amt < 0) return;
    try {
      const { data, error } = await supabase
        .from("goals")
        .update({ saved: amt })
        .eq("id", goalId)
        .select()
        .single();
      if (error) throw error;
      setGoals((prev) => prev.map((g) => g.id===goalId ? data : g));
      success("Savings updated");
      setEditId(null); setEditAmount("");
    } catch (err) {
      toastError("Failed to update savings");
    }
  };

  // CALCULATE TOTALS IN USER'S CURRENCY
  const totalTarget = goals.reduce((a, g) => {
    const goalCurrency = g.original_currency || "USD";
    return a + convertCurrency(g.target, goalCurrency, userCurrency, rates);
  }, 0);

  const totalSaved = goals.reduce((a, g) => {
    const goalCurrency = g.original_currency || "USD";
    return a + convertCurrency(g.saved, goalCurrency, userCurrency, rates);
  }, 0);

  const completed = goals.filter((g) => {
    const goalCurrency = g.original_currency || "USD";
    const convertedTarget = convertCurrency(g.target, goalCurrency, userCurrency, rates);
    const convertedSaved = convertCurrency(g.saved, goalCurrency, userCurrency, rates);
    return convertedSaved >= convertedTarget;
  }).length;

  const fmt = (n) => getCurrencySymbol(userCurrency) + Number(n).toLocaleString(undefined, { minimumFractionDigits:0, maximumFractionDigits:0 });

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.topbar}>
          <div style={s.pageTitle}>Goals</div>
          <div style={s.pill}>{goals.length} goals • {userCurrency}</div>
        </div>

        <div style={s.summaryRow}>
          {[
            { label:"Total target", val:fmt(totalTarget), color:T.brand.primary },
            { label:"Total saved", val:fmt(totalSaved), color:T.color.income },
            { label:"Remaining", val:fmt(Math.max(totalTarget-totalSaved,0)), color:T.color.expense },
            { label:"Completed", val:completed, color:T.color.income },
          ].map((m) => (
            <div key={m.label} style={s.summaryCard}>
              <div style={s.sLabel}>{m.label}</div>
              <div style={{ ...s.sVal, color:m.color }}>{m.val}</div>
            </div>
          ))}
        </div>

        <div style={s.cols}>
          <div style={s.panel}>
            <div style={s.panelHd}>New goal</div>
            <div style={s.fieldLabel}>Goal name</div>
            <input style={s.input} placeholder="e.g. Emergency fund" value={name} onChange={(e) => setName(e.target.value)} />
            <div style={s.fieldLabel}>Target amount ({userCurrency})</div>
            <input style={s.input} type="number" min="0" placeholder="0.00" value={target} onChange={(e) => setTarget(e.target.value)} />
            <div style={s.fieldLabel}>Already saved (optional)</div>
            <input style={s.input} type="number" min="0" placeholder="0.00" value={saved} onChange={(e) => setSaved(e.target.value)} onKeyDown={(e) => e.key==="Enter" && addGoal()} />
            <button style={{ ...s.addBtn, opacity:submitting?0.6:1 }} onClick={addGoal} disabled={submitting}>
              {submitting ? "Saving..." : "+ Add goal"}
            </button>
          </div>

          <div style={s.panel}>
            <div style={s.panelHd}>Your goals</div>
            {loading ? <div style={s.empty}>Loading...</div> : goals.length===0 ? <div style={s.empty}>No goals yet. Add one to get started.</div> : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {goals.map((g, i) => {
                  const goalCurrency = g.original_currency || "USD";
                  const convertedTarget = convertCurrency(g.target, goalCurrency, userCurrency, rates);
                  const convertedSaved = convertCurrency(g.saved, goalCurrency, userCurrency, rates);
                  const pct = Math.min(Math.round((convertedSaved / convertedTarget) * 100), 100);
                  const done = convertedSaved >= convertedTarget;
                  const clr = done ? T.color.income : COLORS[i % COLORS.length];
                  const displayTarget = formatDualCurrency(g.target, goalCurrency, userCurrency, rates);
                  const displaySaved = formatDualCurrency(g.saved, goalCurrency, userCurrency, rates);

                  return (
                    <div key={g.id} style={s.goalCard}>
                      <div style={s.goalTop}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ ...s.dot, background:clr }} />
                          <span style={s.goalName}>{g.name}</span>
                          {done && <span style={s.doneTag}>✓ complete</span>}
                        </div>
                        <button onClick={() => deleteGoal(g.id)} style={s.deleteBtn}>✕</button>
                      </div>
                      <div style={s.barTrack}><div style={{ ...s.barFill, width:`${pct}%`, background:clr }} /></div>
                      <div style={s.goalMeta}>
                        {editId === g.id ? (
                          <div style={{ display:"flex", gap:6, flex:1 }}>
                            <input 
                              style={{ ...s.input, marginBottom:0, flex:1, fontSize:12, padding:"4px 8px" }} 
                              type="number" 
                              min="0" 
                              placeholder="Amount" 
                              value={editAmount} 
                              onChange={(e) => setEditAmount(e.target.value)} 
                              onKeyDown={(e) => e.key==="Enter" && editSaved(g.id, editAmount)}
                              autoFocus
                            />
                            <button style={s.editConfirm} onClick={() => editSaved(g.id, editAmount)}>✓</button>
                            <button style={s.editCancel} onClick={() => { setEditId(null); setEditAmount(""); }}>✕</button>
                          </div>
                        ) : (
                          <>
                            <span style={{ color:clr, fontWeight:500, fontSize: 12, cursor:"pointer" }} onClick={() => { setEditId(g.id); setEditAmount(g.saved); }}>
                              {displaySaved} saved
                            </span>
                            <span style={{ color:T.text.secondary, fontSize: 12 }}>of {displayTarget} · {pct}%</span>
                          </>
                        )}
                      </div>
                      {!done && depositId!==g.id && editId!==g.id && (
                        <button style={s.depositBtn} onClick={() => setDepositId(g.id)}>+ Add savings</button>
                      )}
                      {!done && depositId===g.id && (
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <input style={{ ...s.input, marginBottom:0, flex:1 }} type="number" min="0" placeholder="Amount" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} onKeyDown={(e) => e.key==="Enter" && deposit(g)} />
                          <button style={s.depositConfirm} onClick={() => deposit(g)}>Add</button>
                          <button style={s.cancelBtn} onClick={() => { setDepositId(null); setDepositAmt(""); }}>✕</button>
                        </div>
                      )}
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
  page:{ background:T.bg.base, minHeight:"100vh", color:T.color.white, fontFamily:"sans-serif" },
  container:{ padding:"24px 16px", maxWidth:"960px", margin:"0 auto" },
  topbar:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" },
  pageTitle:{ fontSize:18, fontWeight:500, color:T.text.primary },
  pill:{ fontSize:12, color:T.text.secondary, background:T.bg.elevated, border:`1px solid ${T.bg.border}`, borderRadius:20, padding:"5px 12px" },
  summaryRow:{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:10, marginBottom:"1.25rem" },
  summaryCard:{ background:T.bg.surface, borderRadius:12, border:`1px solid ${T.bg.border}`, padding:"12px 14px" },
  sLabel:{ fontSize:11, color:T.text.secondary, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500, marginBottom:4 },
  sVal:{ fontSize:19, fontWeight:500 },
  cols:{ display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:14 },
  panel:{ background:T.bg.surface, borderRadius:12, border:`1px solid ${T.bg.border}`, padding:16 },
  panelHd:{ fontSize:11, fontWeight:500, color:T.text.secondary, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 },
  fieldLabel:{ fontSize:11, color:T.text.secondary, marginBottom:4, fontWeight:500 },
  input:{ width:"100%", marginBottom:10, padding:"8px 10px", borderRadius:8, border:`1px solid ${T.bg.border}`, background:T.bg.base, color:T.color.white, fontSize:13, outline:"none" },
  addBtn:{ width:"100%", padding:9, background:T.brand.primary, color:T.color.white, fontSize:13, fontWeight:500, border:"none", borderRadius:8, cursor:"pointer" },
  goalCard:{ background:T.bg.base, borderRadius:10, border:`1px solid ${T.bg.border}`, padding:"12px 14px" },
  goalTop:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  goalName:{ fontSize:14, fontWeight:500, color:T.text.primary },
  doneTag:{ fontSize:10, fontWeight:500, background:T.color.incomeDim, color:T.color.income, borderRadius:20, padding:"2px 8px" },
  dot:{ width:8, height:8, borderRadius:"50%", flexShrink:0 },
  barTrack:{ background:T.bg.elevated, borderRadius:4, height:7, overflow:"hidden", marginBottom:8 },
  barFill:{ height:"100%", borderRadius:4, transition:"width 0.5s cubic-bezier(.4,0,.2,1)" },
  goalMeta:{ display:"flex", justifyContent:"space-between", fontSize:12, alignItems:"center" },
  depositBtn:{ marginTop:10, width:"100%", padding:"6px", background:"transparent", border:`1px solid ${T.bg.border}`, color:T.text.secondary, fontSize:12, borderRadius: 8, cursor:"pointer" },
  depositConfirm:{ padding:"8px 12px", background:T.color.income, color:T.color.white, border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500 },
  editConfirm:{ padding:"4px 8px", background:T.color.income, color:T.color.white, border:"none", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:500 },
  editCancel:{ padding:"4px 8px", background:"transparent", border:`1px solid ${T.bg.border}`, color:T.text.secondary, borderRadius:6, cursor:"pointer", fontSize:11 },
  cancelBtn:{ padding:"8px 10px", background:"transparent", border:`1px solid ${T.bg.border}`, color:T.text.secondary, borderRadius:8, cursor:"pointer", fontSize:12 },
  deleteBtn:{ background:"transparent", border:"none", color:T.text.muted, fontSize:11, cursor:"pointer", padding:"2px 5px", borderRadius:4 },
  empty:{ textAlign:"center", padding:"2rem", color:T.text.secondary, fontSize:13 },
};