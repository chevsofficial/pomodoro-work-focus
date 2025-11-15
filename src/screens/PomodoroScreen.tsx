import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';

export const PomodoroScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Pomodoro</Text>
      <Text style={styles.subtitle}>Track your focus and break sessions.</Text>
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
