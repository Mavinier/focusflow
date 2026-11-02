import eslintConfigExpo from 'eslint-config-expo/flat.js'

export default [
  ...eslintConfigExpo,
  {
    ignores: ['.expo/**', 'node_modules/**'],
  },
]
