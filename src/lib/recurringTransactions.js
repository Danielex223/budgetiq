import { supabase } from "./supabase";

/**
 * Create the next occurrence of a recurring transaction
 * Called when a recurring transaction is added or when a scheduled time arrives
 */
export const createNextRecurrence = async (parentTransaction) => {
  if (!parentTransaction.is_recurring || !parentTransaction.frequency) {
    return null;
  }

  const lastDate = new Date(parentTransaction.created_at);
  let nextDate = new Date(lastDate);

  // Calculate next occurrence based on frequency
  if (parentTransaction.frequency === "weekly") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (parentTransaction.frequency === "monthly") {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  // Check if next date is past the recurring_end_date
  if (parentTransaction.recurring_end_date) {
    const endDate = new Date(parentTransaction.recurring_end_date);
    if (nextDate > endDate) {
      return null; // Recurring series has ended
    }
  }

  // Create the next occurrence
  const nextTx = {
    user_id: parentTransaction.user_id,
    type: parentTransaction.type,
    category: parentTransaction.category,
    amount: parentTransaction.amount,
    note: `${parentTransaction.note} [auto-recurring]`,
    original_currency: parentTransaction.original_currency,
    is_recurring: false, // Individual occurrences are not recurring
    frequency: null,
    recurring_end_date: null,
    recurring_parent_id: parentTransaction.id,
    created_at: nextDate.toISOString(),
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert([nextTx])
    .select()
    .single();

  if (error) {
    console.error("Failed to create recurring transaction:", error);
    return null;
  }

  return data;
};

/**
 * Get all recurring transactions that need new occurrences
 * This would typically run on a schedule (e.g., daily cron job)
 * For now, it can be called manually or on app load
 */
export const processRecurringTransactions = async () => {
  try {
    // Get all recurring transactions
    const { data: recurringTxs, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("is_recurring", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const results = [];
    for (const tx of recurringTxs) {
      const nextOccurrence = await createNextRecurrence(tx);
      if (nextOccurrence) {
        results.push(nextOccurrence);
      }
    }

    return results;
  } catch (err) {
    console.error("Error processing recurring transactions:", err);
    return [];
  }
};

/**
 * Format frequency label for display
 */
export const getFrequencyLabel = (frequency) => {
  const labels = {
    weekly: "Every week",
    monthly: "Every month",
  };
  return labels[frequency] || "One-time";
};

/**
 * Calculate next occurrence date for display
 */
export const getNextOccurrenceDate = (baseDate, frequency) => {
  if (!frequency) return null;

  const next = new Date(baseDate);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  }

  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};