// Centralized palette for analytics charts to ensure consistent theming
// These colors are deliberately slightly desaturated / soft to avoid harsh contrast
// against the glass background surfaces. Adjust here and all charts update.
export const analyticsPalette = {
  primary: '#7DD3FC',      // cyan accent (was legacy blue variants)
  primaryAlt: '#38BDF8',
  positive: '#34D399',     // emerald
  negative: '#F87171',     // salmon red
  warning: '#FBBF24',      // amber
  info: '#A78BFA',         // soft violet
  neutral: '#64748B',      // slate
  accentPink: '#F472B6',
  orange: '#FF8042',       // abandoned carts / loss highlight
};

export const categorical = [
  '#7DD3FC', // cyan
  '#F472B6', // pink
  '#34D399', // green
  '#A78BFA', // violet
  '#FBBF24', // amber
  '#F87171', // red
];

export const getCategoricalColor = (index) => categorical[index % categorical.length];
