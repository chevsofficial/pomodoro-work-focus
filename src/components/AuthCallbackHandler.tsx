import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

const AUTH_CALLBACK_PATH = 'auth-callback';
const AUTH_CALLBACK_HOST = 'tomoflow.app';
const AUTH_RECOVERY_PATH = 'auth-recovery';

export const AuthCallbackHandler: React.FC = () => {
  const lastHandledUrl = useRef<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleAuthCallback = useCallback(async (url: string) => {
    if (lastHandledUrl.current === url) {
      return;
    }

    const parsed = Linking.parse(url);
    const isAuthCallback =
      parsed.path === AUTH_CALLBACK_PATH ||
      (parsed.hostname === AUTH_CALLBACK_HOST && parsed.path === AUTH_CALLBACK_PATH);
    const isAuthRecovery =
      parsed.path === AUTH_RECOVERY_PATH ||
      (parsed.hostname === AUTH_CALLBACK_HOST && parsed.path === AUTH_RECOVERY_PATH);

    if (!isAuthCallback && !isAuthRecovery) {
      return;
    }

    lastHandledUrl.current = url;

    try {
      const parsedUrl = new URL(url);
      const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;

      if (!hash) {
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');

      if (!accessToken || !refreshToken) {
        return;
      }

      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        ...(expiresIn ? { expires_in: Number(expiresIn) } : {}),
      });

      if (isAuthRecovery) {
        navigation.navigate('AuthRecovery');
      }
    } catch (error) {
      console.warn('Failed to handle auth callback URL', error);
    }
  }, [navigation]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthCallback(url);
    });

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleAuthCallback(initialUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleAuthCallback]);

  return null;
};
