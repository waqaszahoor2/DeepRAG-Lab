import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { loginUser, registerUser } from './api';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    username?: string;
  } | null;
  access_token: string;
  refresh_token: string;
  provider: 'supabase' | 'backend';
  emailConfirmationRequired?: boolean;
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'yopmail.com',
  'dispostable.com',
  'getnada.com',
  'throwawaymail.com',
  'sharklasers.com',
  'mytemp.email',
  'generator.email',
  'fakeinbox.com',
  'boun.cr',
  'maildrop.cc',
  'tempail.com',
  'crazymailing.com',
]);

/**
 * Checks whether an email belongs to a known temporary/disposable domain
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Unified Sign In method supporting Supabase Auth or Backend API fallback
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase client failed to initialize');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Supabase authentication failed');
    }

    if (!data.session) {
      throw new Error('Sign in succeeded but no active session was returned.');
    }

    const access_token = data.session.access_token;
    const refresh_token = data.session.refresh_token;

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || email,
        username: data.user.user_metadata?.username || email.split('@')[0],
      },
      access_token,
      refresh_token,
      provider: 'supabase',
    };
  }

  // Fallback to Backend FastAPI server
  try {
    const res = await loginUser(email, password);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
    }
    return {
      user: {
        id: 'backend_user',
        email,
      },
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      provider: 'backend',
    };
  } catch (err: any) {
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error(
        'Unable to connect to the backend server. Please make sure your FastAPI backend is running at http://localhost:8000 OR configure Supabase credentials in .env.local'
      );
    }
    throw err;
  }
}

/**
 * Unified Sign Up method with disposable email blocking
 */
export async function signUp(
  email: string,
  username: string,
  password: string
): Promise<AuthResult> {
  if (isDisposableEmail(email)) {
    throw new Error(
      'Temporary or disposable email addresses are not allowed. Please use your official Gmail or permanent email account.'
    );
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase client failed to initialize');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Supabase registration failed');
    }

    const session = data.session;
    const user = data.user;

    if (session) {
      const access_token = session.access_token;
      const refresh_token = session.refresh_token;

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
      }

      return {
        user: {
          id: user?.id || '',
          email: user?.email || email,
          username,
        },
        access_token,
        refresh_token,
        provider: 'supabase',
      };
    } else {
      return {
        user: {
          id: user?.id || '',
          email: user?.email || email,
          username,
        },
        access_token: '',
        refresh_token: '',
        provider: 'supabase',
        emailConfirmationRequired: true,
      };
    }
  }

  // Fallback to Backend FastAPI server
  try {
    const res = await registerUser(email, username, password);
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);
    }
    return {
      user: {
        id: 'backend_user',
        email,
        username,
      },
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      provider: 'backend',
    };
  } catch (err: any) {
    if (err.message && err.message.includes('Failed to fetch')) {
      throw new Error(
        'Unable to connect to the backend server. Please make sure your FastAPI backend is running at http://localhost:8000 OR configure Supabase credentials in .env.local'
      );
    }
    throw err;
  }
}

/**
 * Sign in directly with Google / Gmail OAuth
 */
export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase must be configured in .env.local to enable Google OAuth Sign In.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client failed to initialize');
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard`
    : 'http://localhost:3000/dashboard';

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    throw new Error(error.message || 'Google OAuth Sign In failed');
  }
}

/**
 * Sign Out user from both Supabase and Local Storage
 */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

/**
 * Get current Auth Token
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}
