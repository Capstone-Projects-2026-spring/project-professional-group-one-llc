import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getUserProfile, upsertUserProfile } from '../services/userRepository';

const AuthContext = createContext({});

const LOCAL_LOGIN_STORAGE_KEY = '@aac_local_login';

const LOCAL_ACCOUNTS = {
  admin: {
    username: 'admin',
    password: 'admin',
    role: 'admin',
    displayName: 'Administrator',
  },
  user: {
    username: 'user',
    password: 'user',
    role: 'user',
    displayName: 'User',
  },
};

function buildLocalAuthState(username) {
  const account = LOCAL_ACCOUNTS[username];
  if (!account) {
    return { user: null, profile: null };
  }

  return {
    user: {
      id: `local:${account.username}`,
      email: `${account.username}@local.dev`,
    },
    profile: {
      id: `local:${account.username}`,
      display_name: account.displayName,
      role: account.role,
      is_local: true,
    },
  };
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const authSourceRef = useRef(null);

  const ensureUserProfile = async (authUser) => {
    if (!authUser?.id) {
      return null;
    }

    const existingProfile = await getUserProfile(authUser.id);
    if (existingProfile) {
      return existingProfile;
    }

    const fallbackDisplayName = authUser.user_metadata?.display_name || authUser.email || 'User';
    const fallbackRole = authUser.user_metadata?.role === 'admin' ? 'admin' : 'user';

    return upsertUserProfile({
      id: authUser.id,
      displayName: fallbackDisplayName,
      role: fallbackRole,
    });
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      try {
        const localUsername = await AsyncStorage.getItem(LOCAL_LOGIN_STORAGE_KEY);
        if (localUsername && LOCAL_ACCOUNTS[localUsername]) {
          const localState = buildLocalAuthState(localUsername);
          authSourceRef.current = 'local';
          if (isMounted) {
            setUser(localState.user);
            setProfile(localState.profile);
            setLoading(false);
          }
          return;
        }

        if (!supabase || !isSupabaseConfigured) {
          if (isMounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        const sessionUser = session?.user ?? null;
        authSourceRef.current = sessionUser ? 'supabase' : null;

        if (!isMounted) {
          return;
        }

        setUser(sessionUser);

        if (!sessionUser) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const nextProfile = await ensureUserProfile(sessionUser);
        if (isMounted) {
          setProfile(nextProfile);
          setLoading(false);
        }
      } catch (error) {
        console.warn('[Auth] Failed restoring session:', error.message);
        if (isMounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    hydrateSession();

    if (!supabase || !isSupabaseConfigured) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (authSourceRef.current === 'local') {
        return;
      }

      const sessionUser = session?.user ?? null;
      authSourceRef.current = sessionUser ? 'supabase' : null;
      setUser(sessionUser);

      if (!sessionUser) {
        setProfile(null);
        return;
      }

      try {
        const nextProfile = await ensureUserProfile(sessionUser);
        setProfile(nextProfile);
      } catch (error) {
        console.warn('[Auth] Failed loading profile after auth state change:', error.message);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, options = {}) => {
    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const normalizedRole = options.role === 'admin' ? 'admin' : 'user';
    const displayName = String(options.displayName || '').trim() || email;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: normalizedRole,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data?.session?.user) {
      authSourceRef.current = 'supabase';
      await ensureUserProfile(data.session.user);
    }

    return data;
  };

  const signIn = async (identifier, password) => {
    const normalizedIdentifier = String(identifier || '').trim().toLowerCase();
    const localAccount = LOCAL_ACCOUNTS[normalizedIdentifier];

    if (localAccount && localAccount.password === password) {
      const localState = buildLocalAuthState(localAccount.username);
      authSourceRef.current = 'local';
      setUser(localState.user);
      setProfile(localState.profile);
      await AsyncStorage.setItem(LOCAL_LOGIN_STORAGE_KEY, localAccount.username);
      return localState;
    }

    await AsyncStorage.removeItem(LOCAL_LOGIN_STORAGE_KEY);

    if (!supabase || !isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (error) {
      throw error;
    }

    authSourceRef.current = 'supabase';

    if (data?.user) {
      await ensureUserProfile(data.user);
    }

    return data;
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(LOCAL_LOGIN_STORAGE_KEY);

    if (authSourceRef.current === 'local' || !supabase || !isSupabaseConfigured) {
      authSourceRef.current = null;
      setUser(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
