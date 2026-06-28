export const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  NGN: "₦",
};

export const getCurrencySymbol = (currency) =>
  CURRENCY_SYMBOLS[currency] || "$";

export const fetchExchangeRates = async (base = "USD") => {
  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${base}`
    );
    const data = await res.json();
    return data.rates || {};
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    return {};
  }
};

export const convertCurrency = (amount, from, to, rates) => {
  if (from === to || !rates[to]) return amount;
  const toUSD = from === "USD" ? amount : amount / (rates[from] || 1);
  return toUSD * (rates[to] || 1);
};

// NEW: Format single currency amount
export const formatCurrency = (amount, currency, decimals = 0) => {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
};

// NEW: Format with dual currency display
export const formatDualCurrency = (amount, originalCurrency, userCurrency, rates, decimals = 0) => {
  if (originalCurrency === userCurrency) {
    return formatCurrency(amount, originalCurrency, decimals);
  }

  const originalFormatted = formatCurrency(amount, originalCurrency, decimals);
  const convertedAmount = convertCurrency(amount, originalCurrency, userCurrency, rates);
  const convertedFormatted = formatCurrency(convertedAmount, userCurrency, decimals);
  
  return `${originalFormatted} (${convertedFormatted})`;
};

// NEW: Convert total from all transactions to user's currency
export const convertTotalToUserCurrency = (transactions, userCurrency, rates) => {
  return transactions.reduce((total, tx) => {
    const txCurrency = tx.original_currency || "USD";
    const convertedAmount = convertCurrency(tx.amount, txCurrency, userCurrency, rates);
    return total + convertedAmount;
  }, 0);
};