module.exports = {
  root: true,
  extends: ['@react-native-community', 'prettier'],
  rules: {
    'prettier/prettier': 'off',
    // The following rule is currently causing "errors" for valid patterns
    // where we initialize form state or sync props -> state.
    // Disable it to avoid noise for these common flows.
    'react-hooks/set-state-in-effect': 'off',
  },
  overrides: [
    {
      files: ['metro.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
