import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { signInWithEmail, signUpWithEmail } from '../services/authService';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';
import { useToast } from '../components/ToastProvider';

type AuthMode = 'signIn' | 'signUp';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [passwordVisible, setPasswordVisible] = useState(false);
  

  const handleSubmit = async () => {
    setError(undefined);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError(t('auth.errors.missingCredentials'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(trimmedEmail, password);
        navigation.goBack();
        return;
      }

      const signUpResult = await signUpWithEmail(trimmedEmail, password);

      if (signUpResult.status === 'existingAccount') {
        setError(t('auth.errors.accountExists'));
        return;
      }

      showToast(t('auth.verifyEmailBody'), 'success');
      navigation.goBack();
    } catch (err: any) {
      const message = err?.message?.toLowerCase?.() ?? '';

      if (message.includes('email not confirmed')) {
        setError(t('auth.errors.accountUnverified'));
        return;
      }

      setError(err?.message ?? t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setError(undefined);
  };

  const ctaLabel = mode === 'signIn' ? t('common.signIn') : t('auth.createAccount');
  const toggleLabel =
    mode === 'signIn' ? t('auth.toggleToSignUp') : t('auth.toggleToSignIn');

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={80}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'signIn' ? t('auth.titleSignIn') : t('auth.titleSignUp')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setPasswordVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            >
              <Text style={styles.eyeText}>{passwordVisible ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonLabel}>{loading ? t('auth.loading') : ctaLabel}</Text>
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
    passwordRow: {
      position: 'relative',
      marginBottom: spacing.md,
    },
    passwordInput: {
      paddingRight: 44,
      marginBottom: 0,
    },
    eyeButton: {
      position: 'absolute',
      right: spacing.md,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    eyeText: {
      fontSize: 18,
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

  