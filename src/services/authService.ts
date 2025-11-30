import { supabaseClient } from './supabaseClient';

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string) => {
  const emailRedirectTo = 'tomoflow://auth-callback';

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
};
