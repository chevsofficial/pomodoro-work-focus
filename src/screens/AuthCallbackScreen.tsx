import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';

export const AuthCallbackScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    // Custom schemes like tomoflow:// only open real builds or dev clients (not Expo Go).
    const timeout = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'RootTabs' }],
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <ScreenContainer>
      <Text style={styles.title}>Email confirmed 🎉</Text>
      <Text style={styles.body}>
        You can now sign in to TomoFlow using your email and password.
      </Text>
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    title: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    body: {
      color: colors.textSecondary,
    },
  });
}
