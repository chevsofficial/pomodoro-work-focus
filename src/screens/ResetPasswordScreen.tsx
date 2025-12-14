import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { supabase } from '../services/supabaseClient';
import { t } from '../i18n/translations';
import { useToast } from '../components/ToastProvider';

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const route = useRoute<RouteProp<RootStackParamList, 'ResetPassword'>>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          if (!mounted) return;
          if (!d2.session) setError(t('auth.recovery.sessionExpired'));
        }, 600);
      }
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) setError(undefined);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (route.params?.errorCode === 'otp_expired') {
      setError(t('auth.recovery.linkExpired'));
    }
  }, [route.params?.errorCode]);

  const handleSubmit = async () => {
    setError(undefined);
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (trimmedPassword.length < 8) {
      setError(t('auth.recovery.passwordTooShort'));
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setError(t('auth.recovery.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!sessionData.session) {
        setError(t('auth.recovery.sessionExpired'));
        return;
      }

      await supabase.auth.updateUser({ password: trimmedPassword });
      showToast(t('auth.recovery.successToast'), 'success');
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      }, 800);
    } catch (err: any) {
      setError(err?.message ?? t('auth.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={80}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.recovery.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.recovery.subtitle')}</Text>

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('auth.recovery.newPasswordPlaceholder')}
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

          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder={t('auth.recovery.confirmPasswordPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!confirmPasswordVisible}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setConfirmPasswordVisible((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={confirmPasswordVisible ? 'Hide password' : 'Show password'}
            >
              <Image
                source={
                  confirmPasswordVisible
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
            <Text style={styles.primaryButtonLabel}>
              {loading ? t('auth.loading') : t('auth.recovery.updateCta')}
            </Text>
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
      gap: spacing.sm,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      backgroundColor: colors.background,
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
    error: {
      color: colors.danger ?? '#ff6b6b',
    },
    passwordRow: {
      position: 'relative',
    },
    passwordInput: {
      paddingRight: 44,
    },
    eyeButton: {
      position: 'absolute',
      right: spacing.md,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    eyeIcon: {
      width: 22,
      height: 22,
    },
  });
