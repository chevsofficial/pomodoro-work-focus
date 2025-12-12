import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabaseClient';
import { useToast } from './ToastProvider';
import { t } from '../i18n/translations';

const AUTH_CALLBACK_PATH = 'auth-callback';
const AUTH_CALLBACK_HOST = 'tomoflow.app';

export const AuthCallbackHandler: React.FC = () => {
  const { showToast } = useToast();
  const lastHandledUrl = useRef<string | null>(null);

  const handleAuthCallback = useCallback(
    async (url: string) => {
      if (lastHandledUrl.current === url) {
        return;
      }

      const parsed = Linking.parse(url);
      const isAuthCallback =
        parsed.path === AUTH_CALLBACK_PATH ||
        (parsed.hostname === AUTH_CALLBACK_HOST && parsed.path === AUTH_CALLBACK_PATH);

      if (!isAuthCallback) {
        return;
      }

      lastHandledUrl.current = url;
      showToast(t('auth.verificationSuccess'), 'success');

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
      } catch (error) {
        console.warn('Failed to handle auth callback URL', error);
      }
    },
    [showToast],
  );

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

