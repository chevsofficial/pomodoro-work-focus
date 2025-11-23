module.exports = {
  root: true,
  extends: ['@react-native-community', 'prettier'],
  rules: {
    'prettier/prettier': 'off',
    // The following rule is currently causing "errors" for valid patterns
    // where we initialize form state or sync props -> state.
    // We only want this as a warning, not a build blocker.
    'react-hooks/set-state-in-effect': 'warn',
  },
};
