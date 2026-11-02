export const colors = {
  background: '#0d1114',
  surface: '#151b20',
  surfaceRaised: '#1d272e',
  border: '#2b373e',
  text: '#f1f6f1',
  textMuted: '#a8b5ae',
  textSubtle: '#708078',
  accent: '#d8f26b',
  accentPressed: '#c1dc55',
  accentText: '#17200e',
  info: '#8fcbff',
  success: '#7ed6c0',
  warning: '#f5b97d',
  danger: '#ff9eaa',
  activity: {
    java: '#d8f26b',
    sql: '#7ed6c0',
    nosql: '#c2a6ff',
    work: '#a8b9ff',
    reading: '#f5b97d',
    notes: '#ff9eaa',
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const

export const typography = {
  display: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
} as const

export const theme = {
  colors,
  spacing,
  radii,
  typography,
} as const
