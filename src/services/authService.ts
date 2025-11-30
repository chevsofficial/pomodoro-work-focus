import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabaseClient';

// Note: the tomoflow:// scheme will only open real builds or dev clients, not Expo Go.
const redirectUrl = AuthSession.makeRedirectUri({
  scheme: 'tomoflow',
  path: 'auth-callback',
});

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
