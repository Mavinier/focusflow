export const ACTIVITY_COLORS = {
  java: '#d8f26b',
  sql: '#7ed6c0',
  nosql: '#c2a6ff',
  work: '#a8b9ff',
  reading: '#f5b97d',
  notes: '#ff9eaa',
} as const

// Additional colors for future study and work areas. They are intentionally
// bright, muted, and readable against FocusFlow's dark surfaces.
export const FUTURE_ACTIVITY_COLORS = [
  '#72c9f4',
  '#61ddd4',
  '#8fe388',
  '#f0dc75',
  '#f29b69',
  '#ff8f70',
  '#f27d8a',
  '#e98ab6',
  '#e29bff',
  '#a88cff',
  '#8f9bff',
  '#89a7f5',
  '#9bb7a5',
  '#8dd7c7',
  '#f0a7d7',
  '#c7d4e8',
] as const

export const ACTIVITY_COLOR_PALETTE = [
  ...Object.values(ACTIVITY_COLORS),
  ...FUTURE_ACTIVITY_COLORS,
] as const

export const DEFAULT_ACTIVITY_COLOR = ACTIVITY_COLORS.java
