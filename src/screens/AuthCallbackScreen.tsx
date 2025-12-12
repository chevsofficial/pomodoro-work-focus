import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';

export const AuthCallbackScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>Account verified ✅</Text>
        <Text style={styles.body}>
          Your account has been successfully verified. You can now sign in to TomoFlow.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'RootTabs' }] })}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    content: { gap: spacing.md },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '800',
    },
    body: { color: colors.textSecondary, lineHeight: 20 },
    button: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    buttonText: { color: colors.surface, fontWeight: '700' },
  });
}
