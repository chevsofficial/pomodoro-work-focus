import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';

export const InfoScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Info</Text>
      <Text style={styles.subtitle}>Learn more about Pomodoro Focus.</Text>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
