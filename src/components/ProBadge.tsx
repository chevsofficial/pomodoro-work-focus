import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

type ProBadgeProps = {
  style?: StyleProp<TextStyle>;
};

export const ProBadge: React.FC<ProBadgeProps> = ({ style }) => {
  return <Text style={[styles.label, style]}>PRO</Text>;
};

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5A5F',
  },
});
