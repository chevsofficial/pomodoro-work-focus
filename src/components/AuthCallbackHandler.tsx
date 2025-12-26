import React, { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabaseClient';
import { resetTo } from '../navigation/navigationRef';
import useAppStore from '../store/appStore';

const AUTH_CALLBACK_PATH = 'auth-callback';
const AUTH_RECOVERY_PATH = 'auth-recovery';

const normalizePath = (value?: string | null) => {
  if (!value) return '';
  return value.startsWith('/') ? value.slice(1) : value;
};

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
    let parsed: Linking.ParsedURL;

    try {
      parsed = Linking.parse(url);
      if (__DEV__) {
        console.log('[AuthCallbackHandler] Linking.parse:', {
          hostname: parsed.hostname,
          path: parsed.path,
          scheme: parsed.scheme,
        });
      }
    } catch (e) {
      console.log('[AuthCallbackHandler] Linking.parse failed', e);
      parsed = { hostname: null, path: null, queryParams: null, scheme: null };
    }

    if (lastHandledUrl.current === url) {
      return;
    }

    const path = normalizePath(parsed.path);

    // Fallback: if parse() doesn’t give us a path, parse from URL manually
    let fallbackPath = '';
    try {
      const u = new URL(url);
      // For tomoflow://auth-recovery -> hostname is auth-recovery
      fallbackPath = normalizePath(u.hostname || u.pathname);
    } catch {}

    const effectivePath = path || fallbackPath;

    const isAuthRecovery = effectivePath === AUTH_RECOVERY_PATH;
    const isAuthCallback = effectivePath === AUTH_CALLBACK_PATH;

    const p = getParamsFromUrl(url);
    if (__DEV__) {
      console.log('[AuthCallbackHandler] extracted params:', {
        isAuthRecovery,
        isAuthCallback,
        hasAccessToken: !!p.accessToken,
        hasRefreshToken: !!p.refreshToken,
        type: p.type,
        errorCode: p.errorCode,
      });
    }

    if (!isAuthCallback && !isAuthRecovery) {
      return;
    }

    try {
      const { accessToken, refreshToken, expiresIn, errorCode } = p;

      if (effectivePath === AUTH_RECOVERY_PATH) {
        lastHandledUrl.current = url;
        if (errorCode) {
          useAppStore.getState().setPasswordRecovery(false);
          resetTo('ForgotPassword');
          return;
        }

        if (accessToken && refreshToken) {
          useAppStore.getState().setPasswordRecovery(true);
          resetTo('ResetPassword');

          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
            ...(expiresIn ? { expires_in: Number(expiresIn) } : {}),
          });
        }

        return;
      }

      lastHandledUrl.current = url;

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
