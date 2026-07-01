/**
 * BudgetIQ Theme — single source of truth
 * Change colors here and they apply everywhere.
 *
 * BACKGROUNDS (dark → light)
 *   bg.base      → outermost page background
 *   bg.surface   → cards, panels, sidebar
 *   bg.elevated  → modals, dropdowns, hover states
 *   bg.border    → subtle divider lines
 *
 * TEXT
 *   text.primary   → headings, values
 *   text.secondary → labels, metadata
 *   text.muted     → placeholders, disabled
 *   text.subtle    → mid-tone highlights
 *
 * BRAND / ACCENT
 *   brand.primary     → main accent (electric violet)
 *   brand.primaryDim  → translucent chips/badges
 *   brand.primaryGlow → glow effects
 *
 * SEMANTIC
 *   color.income   → emerald  (income, positive, success)
 *   color.expense  → crimson  (expenses, danger)
 *   color.warning  → gold     (budget alerts)
 *   color.blue     → cyan     (info, analytics)
 *   color.pink     → rose     (shopping category)
 *   color.orange   → amber    (transport category)
 *   color.neutral  → slate    (default / unknown)
 *
 * CHART PALETTES
 *   PIE_COLORS  → ordered array for pie/donut slices
 *   CAT_COLORS  → map of category → color
 */

// ─── Core palette ──────────────────────────────────────────────────────────
// Direction: true black base, cool-tinted surfaces, electric violet accent.
// Inspired by Linear, Vercel, and high-end fintech dashboards.

const bg = {
  base:     "#050508",   // true near-black — premium, not blue-navy
  surface:  "#0d0d12",   // cards, sidebar — slightly warm dark
  elevated: "#14141c",   // hover states, selected rows
  border:   "#242430",   // borders & dividers — visible but subtle
};

const text = {
  primary:   "#eeeef0",  // near-white — clean, not harsh
  secondary: "#8585a0",  // medium gray-violet — readable labels
  muted:     "#4a4a60",  // placeholders, disabled
  subtle:    "#b8b8cc",  // mid-tone, secondary values
};

const brand = {
  primary:     "#7c6dfa",  // electric violet — vivid, premium
  primaryDim:  "rgba(124,109,250,0.16)",
  primaryGlow: "rgba(124,109,250,0.32)",
};

const color = {
  // Emerald green — not the tired teal, a proper vivid green
  income:      "#10e8a0",
  incomeDim:   "rgba(16,232,160,0.14)",

  // Crimson red — clean, not orange-red
  expense:     "#ff4d6d",
  expenseDim:  "rgba(255,77,109,0.14)",
  expenseMid:  "rgba(255,77,109,0.30)",

  // Electric gold — warm, premium, not muddy amber
  warning:     "#ffc300",
  warningDim:  "rgba(255,195,0,0.14)",

  // Neon cyan — data-viz staple, pops on dark
  blue:        "#00d4ff",

  // Vivid rose — modern pink, not bubblegum
  pink:        "#ff6eb4",

  // Warm orange — energetic, distinct from red
  orange:      "#ff8c42",

  // Slate — cool-toned neutral
  neutral:     "#7070a0",

  white:       "#ffffff",
  whiteDim:    "rgba(255,255,255,0.75)",
};

// ─── Chart palettes ─────────────────────────────────────────────────────────

export const PIE_COLORS = [
  brand.primary,   // electric violet
  color.pink,      // vivid rose
  color.expense,   // crimson
  color.orange,    // warm orange
  color.blue,      // neon cyan
  color.warning,   // electric gold
  color.income,    // emerald
];

export const CAT_COLORS = {
  Food:          color.expense,
  Transport:     color.orange,
  Rent:          color.warning,
  Salary:        color.income,
  Shopping:      color.pink,
  Entertainment: brand.primary,
  Health:        color.blue,
  default:       color.neutral,
};

// ─── Named exports ──────────────────────────────────────────────────────────

export const T = { bg, text, brand, color };
export default T;