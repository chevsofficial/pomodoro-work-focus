import React, { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { signInWithEmail, signUpWithEmail } from '../services/authService';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';
import { useToast } from '../components/ToastProvider';
import { trackEvent } from '../services/productEvents';

type AuthMode = 'signIn' | 'signUp';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export const AuthScreen: React.FC<Props> = ({ navigation, route }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const initialMode: AuthMode = route.params?.mode === 'signUp' ? 'signUp' : 'signIn';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (route.params?.mode === 'signUp') {
      setMode('signUp');
    }
  }, [route.params?.mode]);

  const handleSubmit = async () => {
    setError(undefined);
    trackEvent('auth_submit_clicked', { mode });
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError(t('auth.errors.missingCredentials'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signInWithEmail(trimmedEmail, password);
        trackEvent('auth_signin_success');
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'RootTabs' }],
          });
        }
        return;
      }

      const signUpResult = await signUpWithEmail(trimmedEmail, password);

      if (signUpResult.status === 'existingAccount') {
        setError(t('auth.errors.accountExists'));
        return;
      }

      showToast(t('auth.verifyEmailBody'), 'success');
      trackEvent('auth_signup_success');
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

  const handleForgotPassword = () => {
    setError(undefined);

    if (mode === 'signIn') {
      navigation.navigate('ForgotPassword');
    }
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'RootTabs' }],
                });
              }
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

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
              <Image
                source={
                  passwordVisible
                    ? require('../../assets/icons/tomato-hide.png')
                    : require('../../assets/icons/tomato-show.png')
                }
                style={styles.eyeIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryButtonLabel}>{loading ? t('auth.loading') : ctaLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleMode}>
            <Text style={styles.toggle}>{toggleLabel}</Text>
          </TouchableOpacity>

          {mode === 'signIn' && (
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>
          )}
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
    backButton: {
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    backButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
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
    eyeIcon: {
      width: 28,
      height: 28,
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
    forgotPassword: {
      color: colors.primary,
      fontWeight: '700',
      marginTop: spacing.sm,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    error: {
      color: colors.danger ?? '#ff6b6b',
      marginBottom: spacing.sm,
    },
  });

  