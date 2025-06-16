import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    const updateSession = (newSession: Session | null) => {
      if (JSON.stringify(sessionRef.current) !== JSON.stringify(newSession)) {
        sessionRef.current = newSession;
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        updateSession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = `${import.meta.env.VITE_SITE_URL || window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signInWithMagicLink,
    signOut
  };
};
