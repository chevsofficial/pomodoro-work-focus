import { supabaseClient } from './supabaseClient';

export type SignUpStatus = 'signedUp' | 'existingAccount' | 'existingUnverified';

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
    const isVerified = Boolean(data.user?.email_confirmed_at);

    return { status: isVerified ? 'existingAccount' : 'existingUnverified', data };
  }

  return { status: 'signedUp', data };
};

export const signOut = async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
};
