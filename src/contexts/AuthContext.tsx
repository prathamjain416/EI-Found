import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  about: string | null;
  program: string | null;
  section: string | null;
  batch: string | null;
  hobby: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  is_admin: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAdmin?: boolean;
  program?: string;
  section?: string;
  batch?: string;
  hobby?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  about?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const mapSupabaseUserToUser = async (supabaseUser: SupabaseUser): Promise<User> => {
    // Fetch profile data - use maybeSingle to avoid errors if profile doesn't exist
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();

    return {
      id: supabaseUser.id,
      name: profile?.display_name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      avatar: profile?.avatar_url || undefined,
      bio: profile?.bio || undefined,
      isAdmin: profile?.is_admin || false,
      program: profile?.program || undefined,
      section: profile?.section || undefined,
      batch: profile?.batch || undefined,
      hobby: profile?.hobby || undefined,
      website: profile?.website || undefined,
      instagram: profile?.instagram || undefined,
      linkedin: profile?.linkedin || undefined,
      twitter: profile?.twitter || undefined,
      about: profile?.about || undefined
    };
  };

  useEffect(() => {
    // Set up auth state listener - CRITICAL: Don't use async to prevent deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
        
        // Use setTimeout to defer async operations and prevent deadlocks
        if (session?.user) {
          setTimeout(() => {
            mapSupabaseUserToUser(session.user).then(setUser).catch(console.error);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        mapSupabaseUserToUser(session.user).then(setUser).catch(console.error);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
  };

  const signup = async (email: string, password: string, name: string) => {
    // Check if email is in allowlist first
    const { data: isAllowed, error: allowlistError } = await supabase
      .rpc('is_email_allowed', { email_to_check: email });
    
    if (allowlistError) {
      console.error('Allowlist check error:', allowlistError);
      throw new Error('Unable to verify email authorization. Please try again.');
    }
    
    if (!isAllowed) {
      throw new Error('This email is not authorized for registration. Please contact an administrator.');
    }
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: name
        }
      }
    });
    
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user || !session?.user) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: updates.name,
        avatar_url: updates.avatar,
        bio: updates.bio,
        program: updates.program,
        section: updates.section,
        batch: updates.batch,
        hobby: updates.hobby,
        website: updates.website,
        instagram: updates.instagram,
        linkedin: updates.linkedin,
        twitter: updates.twitter,
        about: updates.about
      })
      .eq('user_id', user.id);
    
    if (error) throw error;
    
    // Update local state
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      logout,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};