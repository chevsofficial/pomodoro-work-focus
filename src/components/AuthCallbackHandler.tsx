import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabaseClient';
import { navigate, resetTo } from '../navigation/navigationRef';

const AUTH_CALLBACK_PATH = 'auth-callback';
const AUTH_CALLBACK_HOSTS = new Set(['tomoflow.app', 'www.tomoflow.app']);
const AUTH_RECOVERY_PATH = 'auth-recovery';

function getParamsFromUrl(url: string) {
  const u = new URL(url);

  const hashParams = new URLSearchParams(u.hash.startsWith('#') ? u.hash.slice(1) : u.hash);
  const queryParams = new URLSearchParams(u.search.startsWith('?') ? u.search.slice(1) : u.search);

  const get = (k: string) => hashParams.get(k) ?? queryParams.get(k);

  return {
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    expiresIn: get('expires_in'),
    type: get('type'),
    errorCode: get('error_code'),
  };
}

export const AuthCallbackHandler: React.FC = () => {
  const lastHandledUrl = useRef<string | null>(null);

  const handleAuthCallback = useCallback(async (url: string) => {
    if (lastHandledUrl.current === url) {
      return;
    }

    const parsed = Linking.parse(url);
    const hostOk = parsed.hostname ? AUTH_CALLBACK_HOSTS.has(parsed.hostname) : false;
    const isAuthCallback =
      parsed.path === AUTH_CALLBACK_PATH ||
      parsed.hostname === AUTH_CALLBACK_PATH ||
      (hostOk && parsed.path === AUTH_CALLBACK_PATH);
    const isAuthRecovery =
      parsed.path === AUTH_RECOVERY_PATH ||
      parsed.hostname === AUTH_RECOVERY_PATH ||
      (hostOk && parsed.path === AUTH_RECOVERY_PATH);

    if (!isAuthCallback && !isAuthRecovery) {
      return;
    }

    lastHandledUrl.current = url;

    try {
      const { accessToken, refreshToken, expiresIn, errorCode } = getParamsFromUrl(url);

      if (isAuthRecovery) {
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
            ...(expiresIn ? { expires_in: Number(expiresIn) } : {}),
          });
        }

        resetTo('ResetPassword', errorCode ? { errorCode } : undefined);
        return;
      }

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
  }, []);

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
