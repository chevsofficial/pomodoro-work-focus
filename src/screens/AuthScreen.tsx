import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { signInWithEmail, signUpWithEmail } from '../services/authService';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';

type AuthMode = 'signIn' | 'signUp';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    setError(undefined);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await signUpWithEmail(trimmedEmail, password);
        Alert.alert('Check your email', 'Please verify your email to finish signing up.');
      }

      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setError(undefined);
  };

  const ctaLabel = mode === 'signIn' ? 'Sign in' : 'Create account';
  const toggleLabel =
    mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in';

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={80}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'signIn' ? 'Sign in' : 'Create an account'}</Text>
          <Text style={styles.subtitle}>Use your email and password to access Cloud Sync.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonLabel}>{loading ? 'Please wait...' : ctaLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMode}>
            <Text style={styles.toggle}>{toggleLabel}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      marginBottom: spacing.md,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    primaryButtonLabel: {
      color: colors.surface,
      fontWeight: '700',
      fontSize: 16,
    },
    toggle: {
      color: colors.accent,
      fontWeight: '600',
      marginTop: spacing.md,
      textAlign: 'center',
    },
    error: {
      color: colors.danger ?? '#ff6b6b',
      marginBottom: spacing.sm,
    },
  });
