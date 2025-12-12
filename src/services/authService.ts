import { supabaseClient } from './supabaseClient';

export type SignUpStatus = 'signedUp' | 'existingAccount';

export interface SignUpResult {
  status: SignUpStatus;
  data: Awaited<ReturnType<typeof supabaseClient.auth.signUp>>['data'];
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string): Promise<SignUpResult> => {
  const emailRedirectTo = 'https://tomoflow.app/auth-callback';

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    const normalizedMessage = error.message?.toLowerCase() ?? '';

    if (normalizedMessage.includes('already registered')) {
      return { status: 'existingAccount', data };
    }

    throw error;
  }

  const identities = data.user?.identities ?? [];
  const userAlreadyExists = Boolean(data.user) && identities.length === 0;

  if (userAlreadyExists) {
    // Supabase does not reliably return email_confirmed_at for already-existing accounts.
    return { status: 'existingAccount', data };
  }

  return { status: 'signedUp', data };
};

export const signOut = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string) => {
  const redirectTo = 'https://tomoflow.app/auth-recovery';

  const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw error;
  return data;
};
